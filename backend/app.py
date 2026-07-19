"""
Backend Flask da Fazenda Santos.

Cuida do que o frontend nao consegue fazer sozinho:
  - busca do preco da arroba no CEPEA (o site deles bloqueia chamadas
    direto do navegador, entao o backend intermedeia)
  - geracao do PDF do relatorio

Variaveis de ambiente (arquivo .env dentro de backend/):
  SUPABASE_URL
  SUPABASE_SERVICE_KEY   chave service_role do Supabase; nunca exponha no frontend
  FRONTEND_ORIGIN        opcional; se definido, so aceita chamadas desse endereco
"""

import io
import os
import re
import time

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

load_dotenv()

app = Flask(__name__)
_origem = os.environ.get("FRONTEND_ORIGIN", "").strip()
CORS(app, origins=[_origem] if _origem else "*")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

_cache_preco = {"valor": None, "data": None, "buscado_em": 0}
CACHE_SEGUNDOS = 6 * 60 * 60

CABECALHOS_NAVEGADOR = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

# id_indicador 2 = Boi Gordo CEPEA/B3. O widget e o jeito oficial de embutir
# a cotacao em sites, bem mais estavel que raspar a pagina do indicador.
FONTES_CEPEA = [
    "https://www.cepea.org.br/br/widgetproduto.js.aspx?id_indicador%5B%5D=2",
    "https://www.cepea.esalq.usp.br/br/widgetproduto.js.aspx?id_indicador%5B%5D=2",
    "https://www.cepea.esalq.usp.br/br/indicador/boi-gordo.aspx",
]


def _extrair_preco(texto):
    """Acha o primeiro valor monetario plausivel de arroba (entre 100 e 1000)."""
    for bruto in re.findall(r"R\$\s*([\d\.]{1,7},\d{2})", texto):
        valor = float(bruto.replace(".", "").replace(",", "."))
        if 100 <= valor <= 1000:
            return valor
    return None


def _extrair_data(texto):
    achado = re.search(r"(\d{2}/\d{2}/\d{4})", texto)
    return achado.group(1) if achado else None


def _supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


@app.route("/")
def raiz():
    """Health check pro Render saber que o servico esta de pe."""
    return jsonify({"servico": "fazenda-santos-backend", "ok": True})


@app.route("/api/preco-arroba")
def preco_arroba():
    agora = time.time()
    if _cache_preco["valor"] and (agora - _cache_preco["buscado_em"] < CACHE_SEGUNDOS):
        return jsonify({"preco": _cache_preco["valor"], "data": _cache_preco["data"], "fonte": "cache"})

    erros = []
    for fonte in FONTES_CEPEA:
        try:
            resposta = requests.get(fonte, headers=CABECALHOS_NAVEGADOR, timeout=12)
            resposta.raise_for_status()
            valor = _extrair_preco(resposta.text)
            if valor:
                _cache_preco.update({"valor": valor, "data": _extrair_data(resposta.text), "buscado_em": agora})
                return jsonify({"preco": valor, "data": _cache_preco["data"], "fonte": "cepea"})
            erros.append(f"{fonte}: preco nao encontrado no retorno")
        except Exception as erro:
            erros.append(f"{fonte}: {erro}")

    if _cache_preco["valor"]:
        return jsonify({"preco": _cache_preco["valor"], "data": _cache_preco["data"], "fonte": "cache_antigo"})
    return jsonify({"preco": None, "erro": "Nao foi possivel buscar o preco agora. Informe manualmente.", "detalhes": erros}), 502


@app.route("/api/relatorio/pdf", methods=["POST"])
def relatorio_pdf():
    """PDF do periodo. Mesma conta do app: resultado vem dos animais vendidos
    no periodo (venda comparada com tudo que o animal custou), e os gastos
    correntes aparecem separados."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return jsonify({"erro": "Backend nao configurado com SUPABASE_URL/SUPABASE_SERVICE_KEY"}), 500

    corpo = request.get_json(force=True)
    data_inicio = corpo["data_inicio"]
    data_fim = corpo["data_fim"]

    headers = _supabase_headers()

    resultados = requests.get(
        f"{SUPABASE_URL}/rest/v1/vw_resultado_animal"
        f"?select=numero_ferro,lote_nome,valor_total_venda,custo_total,lucro,margem_pct,ganho_peso_arr,dias_na_fazenda,data_venda"
        f"&data_venda=gte.{data_inicio}&data_venda=lte.{data_fim}&data_venda=not.is.null"
        f"&order=data_venda.asc",
        headers=headers, timeout=20,
    ).json()

    custos = requests.get(
        f"{SUPABASE_URL}/rest/v1/custos"
        f"?select=id,custo_original_id,categoria,valor&data=gte.{data_inicio}&data=lte.{data_fim}",
        headers=headers, timeout=20,
    ).json()

    # Regra R5: um custo corrigido deixa de contar
    corrigidos = {c["custo_original_id"] for c in custos if c.get("custo_original_id")}
    custos_validos = [c for c in custos if c["id"] not in corrigidos]

    total_recebido = sum(float(r["valor_total_venda"] or 0) for r in resultados)
    custo_vendidos = sum(float(r["custo_total"] or 0) for r in resultados)
    lucro_total = sum(float(r["lucro"] or 0) for r in resultados)
    margem = (100 * lucro_total / custo_vendidos) if custo_vendidos else None

    total_gasto = sum(float(c["valor"]) for c in custos_validos)
    por_categoria = {}
    for c in custos_validos:
        por_categoria[c["categoria"]] = por_categoria.get(c["categoria"], 0) + float(c["valor"])
    categoria_top = max(por_categoria.items(), key=lambda x: x[1]) if por_categoria else None

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    estilos = getSampleStyleSheet()
    elementos = []

    elementos.append(Paragraph("Fazenda Santos — Relatório financeiro", estilos["Title"]))
    elementos.append(Paragraph(f"Período: {data_inicio} a {data_fim}", estilos["Normal"]))
    elementos.append(Spacer(1, 0.5 * cm))

    tabela_resumo = [
        ["Animais vendidos", str(len(resultados))],
        ["Recebido nas vendas", f"R$ {total_recebido:,.2f}"],
        ["Custo dos vendidos (compra + gastos)", f"R$ {custo_vendidos:,.2f}"],
        ["Lucro", f"R$ {lucro_total:,.2f}"],
        ["Margem", f"{margem:.1f}%" if margem is not None else "—"],
        ["Gastos correntes no período", f"R$ {total_gasto:,.2f}"],
    ]
    if categoria_top:
        pct = 100 * categoria_top[1] / total_gasto if total_gasto else 0
        tabela_resumo.append(["Categoria que mais pesou", f"{categoria_top[0]} ({pct:.0f}%)"])

    tabela = Table(tabela_resumo, colWidths=[9 * cm, 5 * cm])
    tabela.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elementos.append(tabela)
    elementos.append(Spacer(1, 1 * cm))

    if resultados:
        elementos.append(Paragraph("Animais vendidos no período", estilos["Heading2"]))
        linhas = [["Ferro", "Lote", "Lucro (R$)", "Margem (%)", "Ganho (@)", "Dias"]]
        for r in resultados:
            linhas.append([
                str(r["numero_ferro"]),
                r.get("lote_nome") or "Avulso",
                f"{float(r['lucro'] or 0):,.2f}",
                f"{r['margem_pct']}" if r.get("margem_pct") is not None else "—",
                f"{float(r['ganho_peso_arr'] or 0):.1f}",
                str(r.get("dias_na_fazenda") or "—"),
            ])
        tabela_animais = Table(linhas, colWidths=[2 * cm, 4 * cm, 3 * cm, 2.5 * cm, 2.5 * cm, 2 * cm])
        tabela_animais.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d5c3d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elementos.append(tabela_animais)

    doc.build(elementos)
    buffer.seek(0)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True,
                     download_name=f"relatorio_{data_inicio}_{data_fim}.pdf")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
