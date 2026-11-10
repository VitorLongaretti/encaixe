/* =====================================================================
   relatorios.js: Relatórios

   Cinco gráficos de barras horizontais, feitos só com CSS: cada barra é
   um <span> com a largura (width) em porcentagem. A maior barra de cada
   gráfico ocupa a largura toda, e as outras ficam proporcionais a ela.
   O valor de verdade sempre aparece escrito ao lado.

   Cada gráfico tem uma frase de conclusão, gerada a partir dos dados.
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

(function () {
  var api = Encaixe.api;
  var ui = Encaixe.ui;
  var formatar = Encaixe.formatar;
  var e = ui.escaparHtml;

  var seletorPeriodo = document.getElementById('periodo');

  function preencher(id, html) {
    document.getElementById(id).innerHTML = html;
  }

  function escrever(id, texto) {
    document.getElementById(id).textContent = texto;
  }

  // Largura da barra, em %, em relação ao maior valor do gráfico
  function largura(valor, maior) {
    if (maior <= 0) {
      return 0;
    }
    return Math.round((valor / maior) * 100);
  }

  /* Uma barra: rótulo, trilho com a barra dentro, e o valor escrito.
     "detalhe" é o texto menor embaixo do valor (ex.: "14 de 51") */
  function htmlDaBarra(rotulo, valor, maior, textoDoValor, detalhe, classeExtra) {
    return '<li class="barra">' +
      '<span class="barra__rotulo">' + e(rotulo) + '</span>' +
      '<span class="barra__trilho" aria-hidden="true">' +
        '<span class="barra__valor ' + (classeExtra || '') + '" style="width: ' + largura(valor, maior) + '%"></span>' +
      '</span>' +
      '<span class="barra__numero numero">' + e(textoDoValor) +
        (detalhe ? '<span class="barra__detalhe">' + e(detalhe) + '</span>' : '') + '</span>' +
    '</li>';
  }

  function maiorValor(lista, campo) {
    return lista.reduce(function (maior, item) {
      return Math.max(maior, item[campo]);
    }, 0);
  }

  /* ---------- 1 e 2. Taxa de faltas (por UBS e por especialidade) ---------- */
  function mostrarTaxaDeFaltas(linhas, idBarras, idConclusao, comeco) {
    var comDados = linhas.filter(function (linha) { return linha.total > 0; });
    var maior = maiorValor(comDados, 'taxa');
    preencher(idBarras, comDados.map(function (linha) {
      return htmlDaBarra(linha.nome, linha.taxa, maior, formatar.porcentagem(linha.taxa),
        linha.faltas + ' de ' + linha.total + ' consultas');
    }).join(''));

    if (comDados.length === 0 || maior === 0) {
      escrever(idConclusao, 'Nenhuma falta registrada no período.');
      return;
    }
    var primeiro = comDados[0];   // a api já devolve da maior taxa para a menor
    escrever(idConclusao, comeco(primeiro) + ': ' + formatar.porcentagem(primeiro.taxa) +
      ' das consultas terminaram em falta.');
  }

  /* ---------- 3. Motivos de falta ----------
     A api devolve uma linha por UBS e motivo (como o resultado do SQL).
     O gráfico soma as UBS; a conclusão procura a UBS em que um motivo
     pesa mais, como "Transporte explica 5 em cada 10 faltas na UBS X". */
  function mostrarMotivos(linhas) {
    var porMotivo = {};
    var porUbs = {};
    linhas.forEach(function (linha) {
      porMotivo[linha.motivo] = (porMotivo[linha.motivo] || 0) + linha.quantidade;
      if (!porUbs[linha.ubsNome]) {
        porUbs[linha.ubsNome] = { total: 0, motivos: {} };
      }
      porUbs[linha.ubsNome].total = porUbs[linha.ubsNome].total + linha.quantidade;
      porUbs[linha.ubsNome].motivos[linha.motivo] = linha.quantidade;
    });

    var total = 0;
    var motivos = Object.keys(porMotivo).map(function (motivo) {
      total = total + porMotivo[motivo];
      return { motivo: motivo, quantidade: porMotivo[motivo] };
    }).sort(function (a, b) { return b.quantidade - a.quantidade; });

    var maior = maiorValor(motivos, 'quantidade');
    preencher('barras-motivos', motivos.map(function (item) {
      return htmlDaBarra(Encaixe.textos.motivoFalta[item.motivo], item.quantidade, maior,
        formatar.porcentagem(item.quantidade / total), item.quantidade + (item.quantidade === 1 ? ' falta' : ' faltas'));
    }).join(''));

    if (total === 0) {
      escrever('conclusao-motivos', 'Nenhuma falta registrada no período.');
      return;
    }

    // Procura o par (UBS, motivo) com a maior fatia, entre UBS com pelo menos 4 faltas
    var melhor = null;
    Object.keys(porUbs).forEach(function (nomeDaUbs) {
      var ubs = porUbs[nomeDaUbs];
      if (ubs.total < 4) {
        return;
      }
      Object.keys(ubs.motivos).forEach(function (motivo) {
        var fatia = ubs.motivos[motivo] / ubs.total;
        if (melhor === null || fatia > melhor.fatia) {
          melhor = { ubs: nomeDaUbs, motivo: motivo, fatia: fatia };
        }
      });
    });

    if (melhor) {
      escrever('conclusao-motivos', Encaixe.textos.motivoFalta[melhor.motivo] + ' explica ' +
        Math.round(melhor.fatia * 10) + ' em cada 10 faltas na ' + melhor.ubs + '.');
    } else {
      escrever('conclusao-motivos', Encaixe.textos.motivoFalta[motivos[0].motivo] + ' é o motivo de falta mais comum.');
    }
  }

  /* ---------- 4. Reaproveitamento ---------- */
  function mostrarReaproveitamento(linhas) {
    var maior = Math.max(maiorValor(linhas, 'liberadas'), maiorValor(linhas, 'reocupadas'));
    var liberadas = 0;
    var reocupadas = 0;
    preencher('barras-reaproveitamento', linhas.map(function (linha) {
      liberadas = liberadas + linha.liberadas;
      reocupadas = reocupadas + linha.reocupadas;
      // Duas barras por UBS: a tracejada (vagas liberadas) e a do marca-texto (vagas salvas)
      return '<li class="barra barra--dupla">' +
        '<span class="barra__rotulo">' + e(linha.nome) + '</span>' +
        '<span class="barra__trilho" aria-hidden="true">' +
          '<span class="barra__valor barra__valor--liberada" style="width: ' + largura(linha.liberadas, maior) + '%"></span>' +
        '</span>' +
        '<span class="barra__numero numero">' + linha.liberadas + '<span class="barra__detalhe">liberadas</span></span>' +
        '<span class="barra__trilho" aria-hidden="true">' +
          '<span class="barra__valor barra__valor--reocupada" style="width: ' + largura(linha.reocupadas, maior) + '%"></span>' +
        '</span>' +
        '<span class="barra__numero numero">' + linha.reocupadas + '<span class="barra__detalhe">por encaixe</span></span>' +
      '</li>';
    }).join(''));

    if (liberadas === 0) {
      escrever('conclusao-reaproveitamento', 'Nenhuma vaga foi liberada no período.');
      return;
    }
    escrever('conclusao-reaproveitamento', 'Das ' + liberadas + ' vagas liberadas por cancelamento, ' + reocupadas +
      ' foram ocupadas de novo por encaixe (' + formatar.porcentagem(reocupadas / liberadas) + ').');
  }

  /* ---------- 5. Fila por especialidade ---------- */
  function emMeses(dias) {
    var meses = Math.round(dias / 30);
    if (meses < 1) {
      return dias + (dias === 1 ? ' dia' : ' dias');
    }
    return meses + (meses === 1 ? ' mês' : ' meses');
  }

  function mostrarFila(linhas) {
    var comGente = linhas.filter(function (linha) { return linha.quantidade > 0; });
    var maior = maiorValor(comGente, 'quantidade');
    preencher('barras-fila', comGente.map(function (linha) {
      return htmlDaBarra(linha.nome, linha.quantidade, maior,
        linha.quantidade + (linha.quantidade === 1 ? ' pessoa' : ' pessoas'),
        'espera média de ' + emMeses(linha.esperaMediaDias));
    }).join(''));

    if (comGente.length === 0) {
      escrever('conclusao-fila', 'Ninguém aguardando na fila agora.');
      return;
    }
    var maisGente = comGente[0];   // a api já devolve da maior fila para a menor
    var maiorEspera = comGente.slice().sort(function (a, b) { return b.esperaMediaDias - a.esperaMediaDias; })[0];
    escrever('conclusao-fila', maisGente.nome + ' tem mais gente esperando (' + maisGente.quantidade + ' pessoas). ' +
      maiorEspera.nome + ' tem a maior espera: em média, ' + emMeses(maiorEspera.esperaMediaDias) + ' na fila.');
  }

  /* ---------- Carregar ---------- */
  function carregar() {
    var dias = Number(seletorPeriodo.value);
    Promise.all([
      api.relatorios.faltasPorUbs(dias),
      api.relatorios.faltasPorEspecialidade(dias),
      api.relatorios.motivosFalta(dias),
      api.relatorios.reaproveitamento(dias),
      api.relatorios.filaPorEspecialidade()
    ]).then(function (respostas) {
      mostrarTaxaDeFaltas(respostas[0], 'barras-faltas-ubs', 'conclusao-faltas-ubs', function (primeiro) {
        return 'A ' + primeiro.nome + ' tem a maior taxa de faltas';
      });
      mostrarTaxaDeFaltas(respostas[1], 'barras-faltas-especialidade', 'conclusao-faltas-especialidade', function (primeiro) {
        return primeiro.nome + ' é a especialidade com mais faltas';
      });
      mostrarMotivos(respostas[2]);
      mostrarReaproveitamento(respostas[3]);
      mostrarFila(respostas[4]);
    }).catch(function (erro) {
      ui.mostrarToast(erro.message, 'erro');
    });
  }

  seletorPeriodo.addEventListener('change', carregar);
  carregar();
})();
