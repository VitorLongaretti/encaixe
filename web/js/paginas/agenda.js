/* =====================================================================
   agenda.js: Agenda do dia e painel de encaixe (a tela principal)

   A folha mostra uma linha por horário de 20 minutos, como a agenda de
   papel da recepção. Cada linha tem as ações possíveis para o status
   daquela consulta. Quando uma consulta é cancelada, a linha vira
   "Vaga livre" com o botão "Encaixar", que abre o painel de encaixe.

   O momento-chave do pitch está em "responderOferta": quando a recepção
   clica em "Aceitou", a api grava o encaixe e a linha recebe a animação
   do marca-texto.

   Também abre direto numa vaga: agenda.html?vaga=ID (vem do Painel).
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

(function () {
  var api = Encaixe.api;
  var ui = Encaixe.ui;
  var formatar = Encaixe.formatar;
  var datas = Encaixe.datas;
  var regras = Encaixe.regras;
  var validacao = Encaixe.validacao;
  var e = ui.escaparHtml;

  // Horários de início das consultas: 07:00, 07:20 ... 16:40
  var HORARIOS = [];
  for (var minutos = 7 * 60; minutos <= 16 * 60 + 40; minutos = minutos + 20) {
    HORARIOS.push(String(Math.floor(minutos / 60)).padStart(2, '0') + ':' + String(minutos % 60).padStart(2, '0'));
  }

  var NOMES_DOS_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MAXIMO_DE_CANDIDATOS = 5;

  /* ---------- Elementos ---------- */
  var filtroUbs = document.getElementById('filtro-ubs');
  var filtroEspecialidade = document.getElementById('filtro-especialidade');
  var filtroDia = document.getElementById('filtro-dia');
  var agenda = document.getElementById('agenda');
  var tituloDoDia = document.getElementById('agenda-dia');
  var localDaAgenda = document.getElementById('agenda-local');
  var listaDeLinhas = document.getElementById('agenda-linhas');
  var agendaVazia = document.getElementById('agenda-vazia');
  var painelLateral = document.getElementById('painel-encaixe');
  var dialogEncaixe = document.getElementById('dialog-encaixe');
  var conteudoDoDialogEncaixe = document.getElementById('dialog-encaixe-conteudo');

  /* ---------- Dados (vêm da api) e estado da tela ---------- */
  var dados = { ubs: [], especialidades: [], profissionais: [], profissionalUbs: [], pacientes: [], consultas: [] };

  var estado = {
    ubsId: 1,
    especialidadeId: 1,
    dia: datas.inicioDoDia(new Date()),
    // painel de encaixe
    vagaId: null,          // a consulta cancelada que está sendo encaixada
    candidatos: [],        // os até 5 melhores, na ordem da regra
    respostas: {},         // filaId → "Recusou" ou "Não atendeu"
    ofertaFilaId: null,    // para quem a recepção está oferecendo a vaga agora
    // animação
    consultaQueAnima: null // id da consulta que acabou de ser encaixada
  };

  function porId(lista, id) {
    return lista.filter(function (item) { return item.id === id; })[0] || null;
  }

  function primeiraMaiuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function telaLarga() {
    return window.matchMedia('(min-width: 1024px)').matches;
  }

  /* =====================================================================
     Carregar dados
     ===================================================================== */
  function carregarTudo() {
    return Promise.all([
      api.ubs.listar(),
      api.especialidades.listar(),
      api.profissionais.listar(),
      api.profissionalUbs.listar(),
      api.pacientes.listar(),
      api.consultas.listar()
    ]).then(function (respostas) {
      dados.ubs = respostas[0];
      dados.especialidades = respostas[1];
      dados.profissionais = respostas[2];
      dados.profissionalUbs = respostas[3];
      dados.pacientes = respostas[4];
      dados.consultas = respostas[5];
    });
  }

  function recarregarConsultas() {
    return api.consultas.listar().then(function (consultas) {
      dados.consultas = consultas;
      mostrarAgenda();
    });
  }

  function mostrarErro(erro) {
    ui.mostrarToast(erro.message, 'erro');
  }

  /* =====================================================================
     Filtros
     ===================================================================== */
  function opcoesHtml(lista, idSelecionado, rotulo) {
    return lista.map(function (item) {
      var texto = rotulo ? rotulo(item) : item.nome;
      return '<option value="' + item.id + '"' + (item.id === idSelecionado ? ' selected' : '') + '>' + e(texto) + '</option>';
    }).join('');
  }

  function mostrarFiltros() {
    filtroUbs.innerHTML = opcoesHtml(dados.ubs, estado.ubsId);
    filtroEspecialidade.innerHTML = opcoesHtml(dados.especialidades, estado.especialidadeId);
    filtroDia.value = datas.paraIsoData(estado.dia);
  }

  function mudarDia(novoDia) {
    estado.dia = datas.inicioDoDia(novoDia);
    filtroDia.value = datas.paraIsoData(estado.dia);
    fecharPainel(false);
    mostrarAgenda();
  }

  /* =====================================================================
     A folha do dia
     ===================================================================== */

  // Profissionais desta especialidade que atendem nesta UBS neste dia da
  // semana (tabela ProfissionalUbs), mais quem já tem consulta marcada no dia
  function profissionaisDoDia(consultasDoDia) {
    var diaDaSemana = estado.dia.getDay();
    var ids = [];
    dados.profissionalUbs.forEach(function (atendimento) {
      var profissional = porId(dados.profissionais, atendimento.profissionalId);
      if (atendimento.ubsId === estado.ubsId &&
          atendimento.diaSemana === diaDaSemana &&
          profissional.especialidadeId === estado.especialidadeId &&
          ids.indexOf(profissional.id) === -1) {
        ids.push(profissional.id);
      }
    });
    consultasDoDia.forEach(function (consulta) {
      if (ids.indexOf(consulta.profissionalId) === -1) {
        ids.push(consulta.profissionalId);
      }
    });
    return ids;
  }

  /* Monta a lista de linhas da folha. Num mesmo horário pode haver uma
     consulta cancelada (guardada para o histórico) e o encaixe que ocupou
     a vaga. Nesse caso mostramos só o encaixe. Se o horário só tem
     canceladas, mostramos a última, que é a "Vaga livre". */
  function montarLinhas() {
    var diaIso = datas.paraIsoData(estado.dia);
    var consultasDoDia = dados.consultas.filter(function (consulta) {
      return consulta.ubsId === estado.ubsId &&
        consulta.especialidadeId === estado.especialidadeId &&
        consulta.dataHora.slice(0, 10) === diaIso;
    });
    var profissionais = profissionaisDoDia(consultasDoDia);
    var linhas = [];

    HORARIOS.forEach(function (horario) {
      var dataHora = diaIso + 'T' + horario + ':00';
      profissionais.forEach(function (profissionalId) {
        var noHorario = consultasDoDia.filter(function (consulta) {
          return consulta.profissionalId === profissionalId && consulta.dataHora === dataHora;
        });
        var naoCanceladas = noHorario.filter(function (consulta) { return consulta.status !== 'CANCELADA'; });
        if (naoCanceladas.length > 0) {
          naoCanceladas.forEach(function (consulta) { linhas.push({ consulta: consulta }); });
        } else if (noHorario.length > 0) {
          linhas.push({ consulta: noHorario[noHorario.length - 1] });
        } else {
          linhas.push({ livre: true, dataHora: dataHora, profissionalId: profissionalId });
        }
      });
    });
    return { linhas: linhas, quantosProfissionais: profissionais.length };
  }

  // "de Carlos Henrique Lima às 9h20": vai escondido nos botões, para o
  // leitor de tela dizer de qual consulta é cada botão
  function contextoDoBotao(paciente, consulta) {
    return '<span class="so-leitor"> ' + e(paciente.nome) + ', ' + formatar.hora(consulta.dataHora) + '</span>';
  }

  function botao(acao, texto, consulta, paciente, estilo) {
    return '<button class="botao ' + (estilo || 'botao--secundario') + ' botao--compacto" type="button" data-acao="' + acao + '" data-id="' + consulta.id + '">' +
      texto + contextoDoBotao(paciente, consulta) + '</button>';
  }

  // As ações de cada linha dependem do status (seção 8 do briefing)
  function acoesDaConsulta(consulta, paciente, agora) {
    var acoes = [];
    var ativa = regras.estaAtiva(consulta);
    var passou = regras.jaPassou(consulta, agora);
    var ehHoje = datas.mesmoDia(datas.paraData(consulta.dataHora), agora);

    if (consulta.status === 'CANCELADA') {
      if (regras.vagaEstaLivre(consulta, dados.consultas, agora)) {
        acoes.push(botao('encaixar', 'Encaixar', consulta, paciente, 'botao--primario'));
      }
      return acoes;
    }
    if (!ativa) {
      return acoes;   // Faltou ou Atendida: não há mais o que fazer
    }
    if (passou) {
      // O horário já começou: só falta dizer se a pessoa veio
      acoes.push(botao('presenca', 'Registrar presença', consulta, paciente));
      acoes.push(botao('falta', 'Registrar falta', consulta, paciente));
      return acoes;
    }
    if (consulta.status === 'AGENDADA') {
      acoes.push(botao('confirmar', 'Confirmar', consulta, paciente, 'botao--primario'));
    } else if (ehHoje) {
      // Confirmada e é hoje: a recepção já pode registrar presença ou falta
      acoes.push(botao('presenca', 'Registrar presença', consulta, paciente));
      acoes.push(botao('falta', 'Registrar falta', consulta, paciente));
    }
    acoes.push(botao('cancelar', 'Cancelar consulta', consulta, paciente, 'botao--perigoso'));
    return acoes;
  }

  function htmlDaLinhaLivre(linha) {
    return '<li class="linha linha--horario-livre">' +
      '<time class="linha__hora" datetime="' + linha.dataHora + '">' + formatar.horaDaAgenda(linha.dataHora) + '</time>' +
      '<span class="linha__paciente linha__livre">Horário livre</span>' +
      '<span class="linha__status"></span>' +
    '</li>';
  }

  function htmlDaLinhaDeConsulta(consulta, agora) {
    var paciente = porId(dados.pacientes, consulta.pacienteId) || { nome: 'Paciente excluído' };
    var profissional = porId(dados.profissionais, consulta.profissionalId);
    var status = ui.statusVisual(consulta, agora);
    var ehVaga = status.chave === 'vaga';
    var ehEncaixe = consulta.origem === 'ENCAIXE' && consulta.status !== 'CANCELADA';
    var anima = ehEncaixe && consulta.id === estado.consultaQueAnima;

    var classes = 'linha linha--agenda';
    if (ehEncaixe) { classes = classes + ' linha--encaixe'; }
    if (anima) { classes = classes + ' linha--animar'; }

    // A nota menor embaixo do nome: o profissional, e o motivo quando faltou.
    // As anotações da recepção ("cancelou", "faltou por...") ficam em itálico
    // azul, como se fossem escritas à caneta na agenda de papel.
    var nota = '<span class="linha__nota">' + e(profissional.nome) + '</span>';
    if (consulta.status === 'FALTA' && consulta.motivoFalta) {
      nota = nota + '<span class="anotacao">' + e(Encaixe.textos.motivoFalta[consulta.motivoFalta]) + '</span>';
    }

    var pessoa;
    if (ehVaga) {
      pessoa = '<span class="vaga-livre">Vaga livre</span>' +
        '<span class="anotacao">' + e(formatar.nomeCurto(paciente.nome)) + ' cancelou</span>';
    } else if (anima) {
      // A linha que acabou de ser encaixada: "Vaga livre" some e o nome aparece
      // com o traço do marca-texto (mesma animação do Início)
      pessoa = '<span class="troca troca--antes" aria-hidden="true"><span class="vaga-livre">Vaga livre</span></span>' +
        '<span class="troca troca--depois"><mark>' + e(paciente.nome) + '</mark>' + nota + '</span>';
    } else if (ehEncaixe) {
      pessoa = '<mark>' + e(paciente.nome) + '</mark>' + nota;
    } else {
      pessoa = '<span class="linha__nome">' + e(paciente.nome) + '</span>' + nota;
    }

    var htmlStatus = ehVaga ? '' : ui.htmlDoStatus(consulta, agora);
    if (anima) {
      htmlStatus = '<span class="troca troca--depois">' + htmlStatus + '</span>';
    }

    return '<li class="' + classes + '" data-consulta="' + consulta.id + '">' +
      '<time class="linha__hora" datetime="' + consulta.dataHora + '">' + formatar.horaDaAgenda(consulta.dataHora) + '</time>' +
      '<span class="linha__paciente">' + pessoa + '</span>' +
      '<span class="linha__status">' + htmlStatus + '</span>' +
      '<span class="linha__acoes">' + acoesDaConsulta(consulta, paciente, agora).join('') + '</span>' +
    '</li>';
  }

  function mostrarAgenda() {
    var agora = new Date();
    var ubs = porId(dados.ubs, estado.ubsId);
    var especialidade = porId(dados.especialidades, estado.especialidadeId);

    // Cabeçalho da folha: "Sábado, 7 de novembro" + "hoje"/"amanhã" anotado à caneta
    var hoje = datas.inicioDoDia(agora);
    var anotacaoDoDia = '';
    if (datas.mesmoDia(estado.dia, hoje)) {
      anotacaoDoDia = ' <span class="anotacao">hoje</span>';
    } else if (datas.mesmoDia(estado.dia, datas.somarDias(hoje, 1))) {
      anotacaoDoDia = ' <span class="anotacao">amanhã</span>';
    }
    tituloDoDia.innerHTML = e(primeiraMaiuscula(formatar.diaPorExtenso(estado.dia))) + anotacaoDoDia;
    localDaAgenda.textContent = ubs.nome + ', ' + especialidade.nome;

    var resultado = montarLinhas();
    if (resultado.quantosProfissionais === 0) {
      listaDeLinhas.innerHTML = '';
      agendaVazia.hidden = false;
      agendaVazia.textContent = 'Nenhum profissional de ' + especialidade.nome + ' atende na ' + ubs.nome + ' ' +
        regras.DIA_DA_SEMANA_NO_PLURAL[estado.dia.getDay()] + '. Escolha outro dia ou outra UBS.';
      return;
    }
    agendaVazia.hidden = true;
    listaDeLinhas.innerHTML = resultado.linhas.map(function (linha) {
      return linha.livre ? htmlDaLinhaLivre(linha) : htmlDaLinhaDeConsulta(linha.consulta, agora);
    }).join('');

    // A animação roda uma vez só: na próxima vez que a folha for desenhada,
    // a linha já aparece com o traço pronto
    estado.consultaQueAnima = null;
  }

  // Depois de redesenhar a folha, o foco volta para a linha da consulta
  function focarNaConsulta(consultaId) {
    var linha = listaDeLinhas.querySelector('[data-consulta="' + consultaId + '"]');
    if (!linha) {
      tituloDoDia.focus();
      return;
    }
    var primeiroBotao = linha.querySelector('button');
    if (primeiroBotao) {
      primeiroBotao.focus();
    } else {
      linha.setAttribute('tabindex', '-1');
      linha.focus();
    }
  }

  /* =====================================================================
     Ações da folha
     ===================================================================== */
  function cliqueNaFolha(evento) {
    var botaoClicado = evento.target.closest('button[data-acao]');
    if (!botaoClicado) {
      return;
    }
    var id = Number(botaoClicado.getAttribute('data-id'));
    var acao = botaoClicado.getAttribute('data-acao');

    if (acao === 'confirmar') {
      api.consultas.confirmar(id).then(function () {
        ui.mostrarToast('Consulta confirmada.');
        return recarregarConsultas();
      }).then(function () { focarNaConsulta(id); }).catch(mostrarErro);
    } else if (acao === 'presenca') {
      api.consultas.registrarRealizada(id).then(function () {
        ui.mostrarToast('Presença registrada.');
        return recarregarConsultas();
      }).then(function () { focarNaConsulta(id); }).catch(mostrarErro);
    } else if (acao === 'falta') {
      abrirFalta(id);
    } else if (acao === 'cancelar') {
      abrirCancelamento(id);
    } else if (acao === 'encaixar') {
      abrirPainel(id);
    }
  }

  /* ---------- Cancelar ---------- */
  var dialogCancelar = document.getElementById('dialog-cancelar');
  var idParaCancelar = null;

  function abrirCancelamento(id) {
    var consulta = porId(dados.consultas, id);
    var paciente = porId(dados.pacientes, consulta.pacienteId);
    idParaCancelar = id;
    document.getElementById('dialog-cancelar-titulo').textContent = 'Cancelar a consulta de ' + paciente.nome + '?';
    document.getElementById('dialog-cancelar-texto').textContent =
      'O horário das ' + formatar.hora(consulta.dataHora) + ' vira uma vaga livre, e alguém da fila pode ser encaixado.';
    dialogCancelar.showModal();
  }

  // O <form method="dialog"> fecha a janela sozinho. Aqui só olhamos qual
  // botão foi clicado (evento.submitter), o mesmo padrão da tela de Pacientes.
  document.getElementById('formulario-cancelar').addEventListener('submit', function (evento) {
    if (!evento.submitter || evento.submitter.value !== 'cancelar') {
      return;   // "Manter consulta"
    }
    var id = idParaCancelar;
    api.consultas.cancelar(id).then(function () {
      ui.mostrarToast('Consulta cancelada. O horário virou uma vaga livre.');
      return recarregarConsultas();
    }).then(function () { focarNaConsulta(id); }).catch(mostrarErro);
  });

  /* ---------- Registrar falta ---------- */
  var dialogFalta = document.getElementById('dialog-falta');
  var formularioFalta = document.getElementById('formulario-falta');
  var idDaFalta = null;

  function abrirFalta(id) {
    var consulta = porId(dados.consultas, id);
    var paciente = porId(dados.pacientes, consulta.pacienteId);
    idDaFalta = id;
    formularioFalta.reset();
    ui.limparErros(formularioFalta);
    document.getElementById('dialog-falta-texto').textContent =
      paciente.nome + ', consulta das ' + formatar.hora(consulta.dataHora) + '. O motivo aparece nos relatórios.';
    dialogFalta.showModal();
  }

  formularioFalta.addEventListener('submit', function (evento) {
    evento.preventDefault();
    var motivo = formularioFalta.elements.motivo.value;
    if (ui.mostrarErros(formularioFalta, motivo ? {} : { motivoFalta: 'Escolha o motivo da falta.' })) {
      return;
    }
    var id = idDaFalta;
    api.consultas.registrarFalta(id, motivo).then(function () {
      dialogFalta.close();
      ui.mostrarToast('Falta registrada.');
      return recarregarConsultas();
    }).then(function () { focarNaConsulta(id); }).catch(mostrarErro);
  });

  /* =====================================================================
     Painel de encaixe
     ===================================================================== */
  function abrirPainel(vagaId) {
    api.encaixe.candidatos(vagaId).then(function (candidatos) {
      estado.vagaId = vagaId;
      estado.candidatos = candidatos.slice(0, MAXIMO_DE_CANDIDATOS);
      estado.respostas = {};
      estado.ofertaFilaId = null;
      mostrarPainel(true);
    }).catch(mostrarErro);
  }

  function htmlDoCandidato(candidato, posicao) {
    var resposta = estado.respostas[candidato.filaId];
    var emOferta = estado.ofertaFilaId === candidato.filaId;
    var classes = 'candidato' + (resposta ? ' candidato--respondido' : '') + (emOferta ? ' candidato--oferta' : '');
    var tempo = formatar.tempoDesde(candidato.dataEntrada);

    var etiquetas = candidato.motivos.map(function (motivo) {
      return '<li class="etiqueta">' + e(motivo) + '</li>';
    }).join('');

    var parteFinal;
    if (resposta) {
      parteFinal = '<p class="anotacao">' + e(resposta) + '</p>';
    } else if (emOferta) {
      var contato = Encaixe.textos.contatoPreferido[candidato.contatoPreferido];
      parteFinal = '<div class="oferta">' +
        '<p class="oferta__contato">' + Encaixe.icone('telefone') +
          '<span>Prefere ' + e(contato) + ': <strong class="numero">' + e(formatar.telefone(candidato.telefone)) + '</strong></span></p>' +
        '<p class="oferta__pergunta">A pessoa aceitou a vaga?</p>' +
        '<div class="oferta__botoes">' +
          '<button class="botao botao--primario" type="button" data-painel="aceitou" data-fila="' + candidato.filaId + '">Aceitou</button>' +
          '<button class="botao botao--secundario" type="button" data-painel="recusou" data-fila="' + candidato.filaId + '">Recusou</button>' +
          '<button class="botao botao--secundario" type="button" data-painel="nao-atendeu" data-fila="' + candidato.filaId + '">Não atendeu</button>' +
        '</div>' +
      '</div>';
    } else {
      parteFinal = '<button class="botao botao--secundario botao--compacto" type="button" data-painel="oferecer" data-fila="' + candidato.filaId + '">' +
        'Oferecer vaga<span class="so-leitor"> para ' + e(candidato.nome) + '</span></button>';
    }

    return '<li class="' + classes + '">' +
      '<span class="candidato__posicao" aria-hidden="true">' + posicao + '</span>' +
      '<div class="candidato__corpo">' +
        '<h3 class="candidato__nome"><span class="so-leitor">' + posicao + 'º: </span>' + e(candidato.nome) + '</h3>' +
        '<p class="candidato__resumo">' + candidato.idade + ' anos, ' + e(tempo) + ' na fila</p>' +
        '<ul class="etiquetas" aria-label="Por que está nesta posição">' + etiquetas + '</ul>' +
        parteFinal +
      '</div>' +
    '</li>';
  }

  function mostrarPainel(focarNoTitulo) {
    var vaga = porId(dados.consultas, estado.vagaId);
    var especialidade = porId(dados.especialidades, vaga.especialidadeId);
    var profissional = porId(dados.profissionais, vaga.profissionalId);
    var todosResponderam = estado.candidatos.length > 0 && estado.candidatos.every(function (candidato) {
      return Boolean(estado.respostas[candidato.filaId]);
    });

    var html = '<div class="painel-encaixe__topo">' +
        '<h2 class="painel-encaixe__titulo" id="painel-encaixe-titulo" tabindex="-1">Encaixe para ' + formatar.horaDaAgenda(vaga.dataHora) + '</h2>' +
        '<button class="botao botao--secundario botao--compacto" type="button" data-painel="fechar">Fechar</button>' +
      '</div>' +
      '<p class="painel-encaixe__vaga">' + e(especialidade.nome) + ' com ' + e(profissional.nome) + ', ' + e(formatar.diaPorExtenso(vaga.dataHora)) + '.</p>';

    if (estado.candidatos.length === 0) {
      html = html + '<p class="vazio">Ninguém na fila de ' + e(especialidade.nome) + ' desta UBS aceita encaixe agora. A vaga continua livre.</p>';
    } else {
      html = html + '<p class="painel-encaixe__regra">Em ordem: risco, prioridade legal, bairro e tempo de espera.</p>' +
        '<ol class="candidatos">' + estado.candidatos.map(function (candidato, indice) {
          return htmlDoCandidato(candidato, indice + 1);
        }).join('') + '</ol>';
      if (todosResponderam) {
        html = html + '<p class="vazio">Ninguém desta lista aceitou. A vaga continua livre.</p>';
      }
    }

    // O mesmo conteúdo vai para a coluna (desktop) ou para o dialog (celular)
    if (telaLarga()) {
      conteudoDoDialogEncaixe.innerHTML = '';
      painelLateral.innerHTML = html;
      painelLateral.hidden = false;
      agenda.classList.add('agenda--com-painel');
    } else {
      painelLateral.innerHTML = '';
      painelLateral.hidden = true;
      conteudoDoDialogEncaixe.innerHTML = html;
      if (!dialogEncaixe.open) {
        dialogEncaixe.showModal();
      }
    }
    if (focarNoTitulo) {
      document.getElementById('painel-encaixe-titulo').focus();
    }
  }

  // devolverFoco: volta o foco para o botão "Encaixar" de onde a pessoa veio
  function fecharPainel(devolverFoco) {
    var vagaId = estado.vagaId;
    if (vagaId === null) {
      return;
    }
    estado.vagaId = null;
    painelLateral.hidden = true;
    painelLateral.innerHTML = '';
    agenda.classList.remove('agenda--com-painel');
    if (dialogEncaixe.open) {
      dialogEncaixe.close();
    }
    conteudoDoDialogEncaixe.innerHTML = '';
    if (devolverFoco) {
      focarNaConsulta(vagaId);
    }
  }

  // Coloca o foco no botão principal do candidato (oferecer ou "Aceitou")
  function focarNoCandidato(filaId) {
    var alvo = document.querySelector('[data-painel="aceitou"][data-fila="' + filaId + '"]') ||
      document.querySelector('[data-painel="oferecer"][data-fila="' + filaId + '"]');
    if (alvo) {
      alvo.focus();
    }
  }

  // Depois de "Recusou" ou "Não atendeu", a oferta passa para o próximo da lista
  function proximoSemResposta() {
    var proximo = estado.candidatos.filter(function (candidato) {
      return !estado.respostas[candidato.filaId];
    })[0];
    return proximo ? proximo.filaId : null;
  }

  function mensagemDoEncaixe(candidato) {
    var tempo = candidato.tempoNaFila;
    var texto;
    if (tempo.meses >= 1) {
      texto = tempo.meses === 1 ? '1 mês' : tempo.meses + ' meses';
    } else {
      texto = tempo.dias === 1 ? '1 dia' : tempo.dias + ' dias';
    }
    // Frase sem "encaixada/encaixado": o cadastro não tem gênero, e
    // não queremos adivinhar pelo nome
    return 'Encaixe feito: ' + formatar.nomeCurto(candidato.nome) + ' esperava havia ' + texto + ' na fila.';
  }

  /* O momento-chave do pitch: a recepção responde se a pessoa aceitou */
  function responderOferta(resposta, filaId) {
    if (resposta === 'aceitou') {
      var vagaId = estado.vagaId;
      api.encaixe.confirmar(vagaId, filaId).then(function (resultado) {
        estado.consultaQueAnima = resultado.consulta.id;   // a próxima folha desenha a animação
        fecharPainel(false);
        return recarregarConsultas().then(function () {
          ui.mostrarToast(mensagemDoEncaixe(resultado.candidato), 'encaixe');
          focarNaConsulta(resultado.consulta.id);
        });
      }).catch(mostrarErro);
      return;
    }
    estado.respostas[filaId] = resposta === 'recusou' ? 'Recusou' : 'Não atendeu';
    estado.ofertaFilaId = proximoSemResposta();
    mostrarPainel(false);
    if (estado.ofertaFilaId !== null) {
      focarNoCandidato(estado.ofertaFilaId);
    } else {
      document.getElementById('painel-encaixe-titulo').focus();
    }
  }

  function cliqueNoPainel(evento) {
    var botaoClicado = evento.target.closest('[data-painel]');
    if (!botaoClicado) {
      return;
    }
    var acao = botaoClicado.getAttribute('data-painel');
    var filaId = Number(botaoClicado.getAttribute('data-fila'));
    if (acao === 'fechar') {
      fecharPainel(true);
    } else if (acao === 'oferecer') {
      estado.ofertaFilaId = filaId;
      mostrarPainel(false);
      focarNoCandidato(filaId);
    } else {
      responderOferta(acao, filaId);
    }
  }

  /* =====================================================================
     Agendar consulta
     ===================================================================== */
  var dialogAgendar = document.getElementById('dialog-agendar');
  var formularioAgendar = document.getElementById('formulario-agendar');
  var dicaDoProfissional = document.getElementById('dica-agendar-profissional');
  var tentouAgendar = false;

  function lerAgendamento() {
    var campos = formularioAgendar.elements;
    var dia = campos.dia.value;
    var hora = campos.hora.value;
    return {
      pacienteId: Number(campos.pacienteId.value) || null,
      ubsId: Number(campos.ubsId.value) || null,
      profissionalId: Number(campos.profissionalId.value) || null,
      dataHora: dia && hora ? dia + 'T' + hora + ':00' : ''
    };
  }

  // Só aparecem os profissionais que atendem na UBS escolhida
  function mostrarProfissionaisDaUbs() {
    var ubsId = Number(formularioAgendar.elements.ubsId.value);
    var daUbs = dados.profissionais.filter(function (profissional) {
      return dados.profissionalUbs.some(function (atendimento) {
        return atendimento.profissionalId === profissional.id && atendimento.ubsId === ubsId;
      });
    });
    var preferido = daUbs.filter(function (p) { return p.especialidadeId === estado.especialidadeId; })[0];
    formularioAgendar.elements.profissionalId.innerHTML = opcoesHtml(daUbs, preferido ? preferido.id : null, function (profissional) {
      return profissional.nome + ' (' + porId(dados.especialidades, profissional.especialidadeId).nome + ')';
    });
    mostrarDiasDoProfissional();
  }

  // A dica embaixo do campo diz em que dias o profissional atende ali (regra 5)
  function mostrarDiasDoProfissional() {
    var ubsId = Number(formularioAgendar.elements.ubsId.value);
    var profissionalId = Number(formularioAgendar.elements.profissionalId.value);
    var dias = dados.profissionalUbs.filter(function (atendimento) {
      return atendimento.profissionalId === profissionalId && atendimento.ubsId === ubsId;
    }).map(function (atendimento) {
      return atendimento.diaSemana;
    }).sort();
    if (dias.length === 0) {
      dicaDoProfissional.textContent = '';
      return;
    }
    var nomes = dias.map(function (dia) { return NOMES_DOS_DIAS[dia]; });
    var lista = nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1] : nomes[0];
    dicaDoProfissional.textContent = 'Atende nesta UBS: ' + lista + '.';
  }

  function abrirAgendamento() {
    var campos = formularioAgendar.elements;
    tentouAgendar = false;
    formularioAgendar.reset();
    ui.limparErros(formularioAgendar);
    document.getElementById('aviso-agendar').textContent = '';

    campos.pacienteId.innerHTML = '<option value="">Escolha o paciente</option>' + opcoesHtml(dados.pacientes, null);
    campos.ubsId.innerHTML = opcoesHtml(dados.ubs, estado.ubsId);
    mostrarProfissionaisDaUbs();

    var hoje = datas.inicioDoDia(new Date());
    campos.dia.min = datas.paraIsoData(hoje);
    campos.dia.value = datas.paraIsoData(estado.dia < hoje ? hoje : estado.dia);
    campos.hora.innerHTML = '<option value="">Escolha o horário</option>' + HORARIOS.map(function (horario) {
      return '<option value="' + horario + '">' + horario + '</option>';
    }).join('');

    dialogAgendar.showModal();
    campos.pacienteId.focus();   // foco no primeiro campo
  }

  function enviarAgendamento(evento) {
    evento.preventDefault();
    tentouAgendar = true;
    var aviso = document.getElementById('aviso-agendar');
    aviso.textContent = '';
    var dadosDaConsulta = lerAgendamento();
    if (ui.mostrarErros(formularioAgendar, validacao.validarConsulta(dadosDaConsulta, new Date()))) {
      return;
    }
    api.consultas.criar(dadosDaConsulta).then(function (consulta) {
      dialogAgendar.close();
      ui.mostrarToast('Consulta agendada.');
      // A folha passa a mostrar o dia e a agenda da consulta nova
      estado.ubsId = consulta.ubsId;
      estado.especialidadeId = consulta.especialidadeId;
      estado.dia = datas.inicioDoDia(datas.paraData(consulta.dataHora));
      mostrarFiltros();
      return recarregarConsultas().then(function () { focarNaConsulta(consulta.id); });
    }).catch(function (erro) {
      if (erro.campo) {
        var errosDaApi = {};
        errosDaApi[erro.campo] = erro.message;
        ui.mostrarErros(formularioAgendar, errosDaApi);
      } else {
        aviso.textContent = erro.message;
      }
    });
  }

  function validarAgendamentoAoSair(evento) {
    if (!tentouAgendar) {
      return;
    }
    var bloco = evento.target.closest('[data-campo]');
    if (bloco) {
      var campo = bloco.getAttribute('data-campo');
      var erros = validacao.validarConsulta(lerAgendamento(), new Date());
      ui.mostrarErroNoCampo(formularioAgendar, campo, erros[campo] || null);
    }
  }

  /* =====================================================================
     Início
     ===================================================================== */
  function ligarEventos() {
    filtroUbs.addEventListener('change', function () {
      estado.ubsId = Number(filtroUbs.value);
      fecharPainel(false);
      mostrarAgenda();
    });
    filtroEspecialidade.addEventListener('change', function () {
      estado.especialidadeId = Number(filtroEspecialidade.value);
      fecharPainel(false);
      mostrarAgenda();
    });
    filtroDia.addEventListener('change', function () {
      if (validacao.ehDataIsoValida(filtroDia.value)) {
        mudarDia(datas.paraData(filtroDia.value));
      }
    });
    document.getElementById('dia-anterior').addEventListener('click', function () {
      mudarDia(datas.somarDias(estado.dia, -1));
    });
    document.getElementById('proximo-dia').addEventListener('click', function () {
      mudarDia(datas.somarDias(estado.dia, 1));
    });
    document.getElementById('botao-hoje').addEventListener('click', function () {
      mudarDia(new Date());
    });

    listaDeLinhas.addEventListener('click', cliqueNaFolha);
    painelLateral.addEventListener('click', cliqueNoPainel);
    dialogEncaixe.addEventListener('click', cliqueNoPainel);

    // Esc fecha o painel lateral (o dialog do celular já fecha sozinho com Esc)
    painelLateral.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') {
        fecharPainel(true);
      }
    });
    dialogEncaixe.addEventListener('close', function () {
      if (estado.vagaId !== null && !telaLarga()) {
        fecharPainel(true);
      }
    });

    document.getElementById('botao-agendar').addEventListener('click', abrirAgendamento);
    formularioAgendar.addEventListener('submit', enviarAgendamento);
    formularioAgendar.addEventListener('focusout', validarAgendamentoAoSair);
    formularioAgendar.elements.ubsId.addEventListener('change', mostrarProfissionaisDaUbs);
    formularioAgendar.elements.profissionalId.addEventListener('change', mostrarDiasDoProfissional);

    // Botões "Voltar" dos dialogs
    document.querySelectorAll('[data-fechar-dialog]').forEach(function (botaoVoltar) {
      botaoVoltar.addEventListener('click', function () {
        botaoVoltar.closest('dialog').close();
      });
    });
  }

  // agenda.html?vaga=12 abre a agenda no dia da vaga, com o painel de encaixe aberto
  function abrirVagaDoEndereco() {
    var vagaId = Number(new URLSearchParams(window.location.search).get('vaga'));
    var vaga = vagaId ? porId(dados.consultas, vagaId) : null;
    if (!vaga) {
      return;
    }
    estado.ubsId = vaga.ubsId;
    estado.especialidadeId = vaga.especialidadeId;
    estado.dia = datas.inicioDoDia(datas.paraData(vaga.dataHora));
    mostrarFiltros();
    mostrarAgenda();
    if (regras.vagaEstaLivre(vaga, dados.consultas, new Date())) {
      abrirPainel(vaga.id);
    }
  }

  ligarEventos();
  carregarTudo().then(function () {
    mostrarFiltros();
    mostrarAgenda();
    abrirVagaDoEndereco();
  }).catch(mostrarErro);
})();
