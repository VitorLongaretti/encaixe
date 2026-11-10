/* =====================================================================
   painel.js: Painel da recepção

   O resumo do dia de uma UBS:
     - os números do dia (com destaque para o que pede ação)
     - "Precisa de atenção": não confirmadas e vagas livres
     - "Últimos encaixes": quem ocupou uma vaga e quanto esperou

   No roteiro do pitch, é aqui que a recepção vê a vaga livre do Carlos
   e clica em "Encaixar", que leva para agenda.html?vaga=ID.
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

(function () {
  var api = Encaixe.api;
  var ui = Encaixe.ui;
  var formatar = Encaixe.formatar;
  var regras = Encaixe.regras;
  var datas = Encaixe.datas;
  var e = ui.escaparHtml;

  var QUANTOS_ENCAIXES = 5;

  var filtroUbs = document.getElementById('painel-ubs');
  var resumo = document.getElementById('resumo');
  var listaNaoConfirmadas = document.getElementById('lista-nao-confirmadas');
  var listaVagas = document.getElementById('lista-vagas');
  var listaEncaixes = document.getElementById('lista-encaixes');
  var dialogCancelar = document.getElementById('dialog-cancelar');

  var dados = { ubs: [], especialidades: [], profissionais: [], pacientes: [], consultas: [], fila: [] };
  var ubsId = 1;
  var idParaCancelar = null;

  function porId(lista, id) {
    return lista.filter(function (item) { return item.id === id; })[0] || null;
  }

  function primeiraMaiuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  // "Hoje, 9h20", "Amanhã, 9h20" ou "Terça-feira, 10 de novembro, 9h20"
  function quando(dataHora, agora) {
    var dia = datas.paraData(dataHora);
    var hoje = datas.inicioDoDia(agora);
    var prefixo;
    if (datas.mesmoDia(dia, hoje)) {
      prefixo = 'Hoje';
    } else if (datas.mesmoDia(dia, datas.somarDias(hoje, 1))) {
      prefixo = 'Amanhã';
    } else {
      prefixo = primeiraMaiuscula(formatar.diaPorExtenso(dataHora));
    }
    return prefixo + ', ' + formatar.hora(dataHora);
  }

  function descricaoDaConsulta(consulta, agora) {
    var especialidade = porId(dados.especialidades, consulta.especialidadeId);
    var profissional = porId(dados.profissionais, consulta.profissionalId);
    return quando(consulta.dataHora, agora) + ', ' + especialidade.nome + ' com ' + profissional.nome;
  }

  /* ---------- Os números do dia ---------- */
  function calcularNumeros(agora) {
    var hojeIso = datas.paraIsoData(agora);
    var daUbs = dados.consultas.filter(function (consulta) { return consulta.ubsId === ubsId; });
    var deHoje = daUbs.filter(function (consulta) {
      return consulta.dataHora.slice(0, 10) === hojeIso && consulta.status !== 'CANCELADA';
    });
    return {
      hoje: deHoje.length,
      confirmadas: deHoje.filter(function (c) { return c.status === 'CONFIRMADA' || c.status === 'REALIZADA'; }).length,
      naoConfirmadas: daUbs.filter(function (c) { return regras.estaNaoConfirmada(c, agora); }).length,
      vagasLivres: daUbs.filter(function (c) { return regras.vagaEstaLivre(c, dados.consultas, agora); }).length,
      // Vagas salvas no mês: consultas de encaixe com horário neste mês
      salvasNoMes: daUbs.filter(function (c) {
        var dia = datas.paraData(c.dataHora);
        return c.origem === 'ENCAIXE' && c.status !== 'CANCELADA' &&
          dia.getMonth() === agora.getMonth() && dia.getFullYear() === agora.getFullYear();
      }).length
    };
  }

  function itemDoResumo(classe, numero, rotulo, icone) {
    return '<div class="resumo__item ' + classe + '">' +
      '<dt>' + (icone ? Encaixe.icone(icone) : '') + e(rotulo) + '</dt>' +
      '<dd class="numero"><span class="resumo__numero">' + numero + '</span></dd>' +
    '</div>';
  }

  function mostrarResumo(agora) {
    var n = calcularNumeros(agora);
    resumo.innerHTML =
      itemDoResumo('resumo__item--alerta', n.naoConfirmadas, 'Não confirmadas', 'relogio') +
      itemDoResumo('resumo__item--vaga', n.vagasLivres, 'Vagas livres para encaixar') +
      itemDoResumo('resumo__item--salvas', n.salvasNoMes, 'Vagas salvas no mês') +
      itemDoResumo('resumo__item--neutro', n.hoje, 'Consultas hoje') +
      itemDoResumo('resumo__item--neutro', n.confirmadas, 'Confirmadas hoje');
  }

  /* ---------- Precisa de atenção ---------- */
  function contextoDoBotao(paciente, consulta) {
    return '<span class="so-leitor"> ' + e(paciente.nome) + ', ' + formatar.hora(consulta.dataHora) + '</span>';
  }

  function mostrarNaoConfirmadas(agora) {
    var lista = dados.consultas.filter(function (consulta) {
      return consulta.ubsId === ubsId && regras.estaNaoConfirmada(consulta, agora);
    }).sort(function (a, b) { return a.dataHora < b.dataHora ? -1 : 1; });

    if (lista.length === 0) {
      listaNaoConfirmadas.innerHTML = '<li class="itens__vazio">Todas as consultas de hoje e de amanhã estão confirmadas.</li>';
      return;
    }
    listaNaoConfirmadas.innerHTML = lista.map(function (consulta) {
      var paciente = porId(dados.pacientes, consulta.pacienteId);
      var contato = Encaixe.textos.contatoPreferido[paciente.contatoPreferido];
      return '<li class="item">' +
        '<div class="item__texto">' +
          '<strong class="item__nome">' + e(paciente.nome) + '</strong>' +
          '<span>' + e(descricaoDaConsulta(consulta, agora)) + '</span>' +
          '<span class="item__detalhe">' + Encaixe.icone('telefone') +
            '<span><span class="numero">' + e(formatar.telefone(paciente.telefone)) + '</span>, prefere ' + e(contato) + '</span></span>' +
        '</div>' +
        '<div class="item__acoes">' +
          '<button class="botao botao--primario botao--compacto" type="button" data-acao="confirmar" data-id="' + consulta.id + '">Confirmar' + contextoDoBotao(paciente, consulta) + '</button>' +
          '<button class="botao botao--perigoso botao--compacto" type="button" data-acao="cancelar" data-id="' + consulta.id + '">Cancelar consulta' + contextoDoBotao(paciente, consulta) + '</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function mostrarVagas(agora) {
    var vagas = dados.consultas.filter(function (consulta) {
      return consulta.ubsId === ubsId && regras.vagaEstaLivre(consulta, dados.consultas, agora);
    }).sort(function (a, b) { return a.dataHora < b.dataHora ? -1 : 1; });

    if (vagas.length === 0) {
      listaVagas.innerHTML = '<li class="itens__vazio">Nenhuma vaga livre agora.</li>';
      return;
    }
    listaVagas.innerHTML = vagas.map(function (vaga) {
      var paciente = porId(dados.pacientes, vaga.pacienteId);
      var quemCancelou = paciente ? formatar.nomeCurto(paciente.nome) + ' cancelou' : 'Consulta cancelada';
      return '<li class="item item--vaga">' +
        '<div class="item__texto">' +
          '<span class="vaga-livre">Vaga livre</span>' +
          '<span>' + e(descricaoDaConsulta(vaga, agora)) + '</span>' +
          '<span class="anotacao">' + e(quemCancelou) + '</span>' +
        '</div>' +
        '<div class="item__acoes">' +
          // É um link (leva para outra página), com cara de botão
          '<a class="botao botao--primario botao--compacto" href="agenda.html?vaga=' + vaga.id + '">Encaixar' +
            '<span class="so-leitor"> a vaga de ' + e(quando(vaga.dataHora, agora)) + '</span></a>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  /* ---------- Últimos encaixes ----------
     Para saber quanto a pessoa esperou, procuramos o registro dela na fila
     (ENCAIXADO, mesma especialidade e UBS). A espera vai da entrada até a saída. */
  function registroDaFila(consulta) {
    var candidatos = dados.fila.filter(function (registro) {
      return registro.status === 'ENCAIXADO' &&
        registro.pacienteId === consulta.pacienteId &&
        registro.especialidadeId === consulta.especialidadeId &&
        registro.ubsId === consulta.ubsId &&
        registro.dataSaida <= consulta.dataHora.slice(0, 10);
    });
    candidatos.sort(function (a, b) { return a.dataSaida < b.dataSaida ? 1 : -1; });
    return candidatos[0] || null;
  }

  function mostrarEncaixes(agora) {
    var encaixes = dados.consultas.filter(function (consulta) {
      return consulta.ubsId === ubsId && consulta.origem === 'ENCAIXE' && consulta.status !== 'CANCELADA';
    }).map(function (consulta) {
      return { consulta: consulta, registro: registroDaFila(consulta) };
    });

    // Mais recentes primeiro: pela data em que a pessoa saiu da fila
    encaixes.sort(function (a, b) {
      var saidaA = a.registro ? a.registro.dataSaida : '';
      var saidaB = b.registro ? b.registro.dataSaida : '';
      if (saidaA !== saidaB) { return saidaA < saidaB ? 1 : -1; }
      return b.consulta.id - a.consulta.id;
    });
    encaixes = encaixes.slice(0, QUANTOS_ENCAIXES);

    if (encaixes.length === 0) {
      listaEncaixes.innerHTML = '<li class="itens__vazio">Nenhum encaixe nesta UBS ainda.</li>';
      return;
    }
    listaEncaixes.innerHTML = encaixes.map(function (item) {
      var paciente = porId(dados.pacientes, item.consulta.pacienteId);
      var espera = '';
      if (item.registro) {
        var tempo = formatar.tempoDesde(item.registro.dataEntrada, datas.paraData(item.registro.dataSaida));
        espera = '<span class="anotacao">Esperou ' + e(tempo) + ' na fila</span>';
      }
      return '<li class="item item--encaixe">' +
        '<div class="item__texto">' +
          '<strong class="item__nome"><mark>' + e(paciente ? paciente.nome : 'Paciente excluído') + '</mark></strong>' +
          '<span>' + e(descricaoDaConsulta(item.consulta, agora)) + '</span>' +
          espera +
        '</div>' +
      '</li>';
    }).join('');
  }

  function mostrarTudo() {
    var agora = new Date();
    document.getElementById('painel-hoje').textContent = 'Hoje é ' + formatar.diaPorExtenso(agora) + '.';
    mostrarResumo(agora);
    mostrarNaoConfirmadas(agora);
    mostrarVagas(agora);
    mostrarEncaixes(agora);
  }

  function recarregar() {
    return Promise.all([api.consultas.listar(), api.fila.listar()]).then(function (respostas) {
      dados.consultas = respostas[0];
      dados.fila = respostas[1];
      mostrarTudo();
    });
  }

  /* ---------- Ações ---------- */
  function cliqueNasListas(evento) {
    var botao = evento.target.closest('button[data-acao]');
    if (!botao) {
      return;
    }
    var id = Number(botao.getAttribute('data-id'));
    if (botao.getAttribute('data-acao') === 'confirmar') {
      api.consultas.confirmar(id).then(function () {
        ui.mostrarToast('Consulta confirmada.');
        return recarregar();
      }).then(function () {
        document.getElementById('atencao-titulo').focus();
      }).catch(function (erro) {
        ui.mostrarToast(erro.message, 'erro');
      });
    } else {
      var consulta = porId(dados.consultas, id);
      var paciente = porId(dados.pacientes, consulta.pacienteId);
      idParaCancelar = id;
      document.getElementById('dialog-cancelar-titulo').textContent = 'Cancelar a consulta de ' + paciente.nome + '?';
      document.getElementById('dialog-cancelar-texto').textContent =
        'O horário vira uma vaga livre, e alguém da fila pode ser encaixado.';
      dialogCancelar.showModal();
    }
  }

  document.getElementById('formulario-cancelar').addEventListener('submit', function (evento) {
    if (!evento.submitter || evento.submitter.value !== 'cancelar') {
      return;
    }
    api.consultas.cancelar(idParaCancelar).then(function () {
      ui.mostrarToast('Consulta cancelada. O horário virou uma vaga livre.');
      return recarregar();
    }).then(function () {
      // O foco vai para o botão "Encaixar" da vaga nova, que é o próximo passo
      var encaixar = listaVagas.querySelector('a');
      if (encaixar) { encaixar.focus(); }
    }).catch(function (erro) {
      ui.mostrarToast(erro.message, 'erro');
    });
  });

  /* ---------- Início ---------- */
  function iniciar() {
    document.getElementById('atencao-titulo').setAttribute('tabindex', '-1');
    listaNaoConfirmadas.addEventListener('click', cliqueNasListas);
    filtroUbs.addEventListener('change', function () {
      ubsId = Number(filtroUbs.value);
      mostrarTudo();
    });

    Promise.all([
      api.ubs.listar(), api.especialidades.listar(), api.profissionais.listar(),
      api.pacientes.listar(), api.consultas.listar(), api.fila.listar()
    ]).then(function (respostas) {
      dados.ubs = respostas[0];
      dados.especialidades = respostas[1];
      dados.profissionais = respostas[2];
      dados.pacientes = respostas[3];
      dados.consultas = respostas[4];
      dados.fila = respostas[5];
      filtroUbs.innerHTML = dados.ubs.map(function (ubs) {
        return '<option value="' + ubs.id + '"' + (ubs.id === ubsId ? ' selected' : '') + '>' + e(ubs.nome) + '</option>';
      }).join('');
      mostrarTudo();
    }).catch(function (erro) {
      ui.mostrarToast(erro.message, 'erro');
    });
  }

  iniciar();
})();
