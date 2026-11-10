/* =====================================================================
   fila.js: Fila de espera (CRUD)

   Segue o mesmo modelo da página de Pacientes: ler o formulário,
   validar, chamar a api, mostrar o toast e atualizar a lista.

   A lista aparece NA MESMA ORDEM da regra de encaixe (regras.js):
   risco, prioridade legal, bairro da UBS e data de entrada. Assim, a
   recepção vê aqui exatamente quem seria chamado primeiro.
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

(function () {
  var api = Encaixe.api;
  var ui = Encaixe.ui;
  var formatar = Encaixe.formatar;
  var validacao = Encaixe.validacao;
  var regras = Encaixe.regras;
  var datas = Encaixe.datas;
  var e = ui.escaparHtml;

  /* ---------- Elementos ---------- */
  var formulario = document.getElementById('formulario-fila');
  var tituloDoFormulario = document.getElementById('formulario-titulo');
  var botaoSalvar = document.getElementById('botao-salvar');
  var botaoCancelarEdicao = document.getElementById('botao-cancelar-edicao');
  var avisoDoFormulario = document.getElementById('aviso-formulario');
  var buscaPaciente = document.getElementById('busca-paciente');
  var listaDePacientes = document.getElementById('fila-paciente');

  var filtroEspecialidade = document.getElementById('filtro-especialidade');
  var filtroUbs = document.getElementById('filtro-ubs');
  var tituloDaLista = document.getElementById('lista-titulo');
  var contagem = document.getElementById('contagem');
  var molduraDaTabela = document.getElementById('moldura-tabela');
  var corpoDaTabela = document.getElementById('lista-fila');
  var listaVazia = document.getElementById('lista-vazia');

  var dialogRemover = document.getElementById('dialog-remover');

  /* ---------- Dados e estado ---------- */
  var dados = { fila: [], pacientes: [], especialidades: [], ubs: [] };
  var idEmEdicao = null;
  var jaTentouEnviar = false;
  var salvando = false;
  var idParaRemover = null;

  function porId(lista, id) {
    return lista.filter(function (item) { return item.id === id; })[0] || null;
  }

  function opcoesHtml(lista, primeiraOpcao) {
    var html = primeiraOpcao ? '<option value="">' + e(primeiraOpcao) + '</option>' : '';
    return html + lista.map(function (item) {
      return '<option value="' + item.id + '">' + e(item.nome) + '</option>';
    }).join('');
  }

  /* =====================================================================
     Formulário
     ===================================================================== */

  // A busca mostra só os pacientes cujo nome ou CPF combina com o texto
  function mostrarPacientesDaBusca() {
    var busca = buscaPaciente.value.trim();
    var textoDaBusca = ui.textoParaBusca(busca);
    var numerosDaBusca = validacao.somenteDigitos(busca);
    var selecionado = Number(listaDePacientes.value);

    var encontrados = dados.pacientes.filter(function (paciente) {
      if (busca === '') { return true; }
      if (ui.textoParaBusca(paciente.nome).indexOf(textoDaBusca) !== -1) { return true; }
      return numerosDaBusca.length >= 3 && paciente.cpf.indexOf(numerosDaBusca) !== -1;
    });

    listaDePacientes.innerHTML = encontrados.map(function (paciente) {
      return '<option value="' + paciente.id + '"' + (paciente.id === selecionado ? ' selected' : '') + '>' +
        e(paciente.nome) + ' (CPF ' + e(formatar.cpf(paciente.cpf)) + ')</option>';
    }).join('');

    // Se só sobrou uma pessoa, ela já fica escolhida
    if (encontrados.length === 1) {
      listaDePacientes.value = String(encontrados[0].id);
    }
  }

  function lerFormulario() {
    var campos = formulario.elements;
    return {
      pacienteId: Number(campos.pacienteId.value) || null,
      especialidadeId: Number(campos.especialidadeId.value) || null,
      ubsId: Number(campos.ubsId.value) || null,
      dataEntrada: campos.dataEntrada.value,
      classificacaoRisco: campos.classificacaoRisco.value
    };
  }

  function voltarParaCadastro() {
    formulario.reset();
    ui.limparErros(formulario);
    avisoDoFormulario.textContent = '';
    idEmEdicao = null;
    jaTentouEnviar = false;
    formulario.elements.dataEntrada.value = datas.paraIsoData(new Date());   // padrão: hoje
    mostrarPacientesDaBusca();
    tituloDoFormulario.textContent = 'Adicionar à fila';
    botaoSalvar.textContent = 'Adicionar à fila';
    botaoCancelarEdicao.hidden = true;
  }

  function comecarEdicao(registro) {
    voltarParaCadastro();
    idEmEdicao = registro.id;
    var campos = formulario.elements;
    campos.pacienteId.value = String(registro.pacienteId);
    campos.especialidadeId.value = String(registro.especialidadeId);
    campos.ubsId.value = String(registro.ubsId);
    campos.dataEntrada.value = registro.dataEntrada;
    campos.classificacaoRisco.value = registro.classificacaoRisco;
    tituloDoFormulario.textContent = 'Editar dados da fila';
    botaoSalvar.textContent = 'Salvar alterações';
    botaoCancelarEdicao.hidden = false;
    listaDePacientes.focus();
  }

  function enviarFormulario(evento) {
    evento.preventDefault();
    if (salvando) {
      return;
    }
    jaTentouEnviar = true;
    avisoDoFormulario.textContent = '';

    var dadosDoFormulario = lerFormulario();
    if (ui.mostrarErros(formulario, validacao.validarRegistroFila(dadosDoFormulario, new Date()))) {
      return;
    }

    var estavaEditando = idEmEdicao !== null;
    var pedido = estavaEditando ? api.fila.atualizar(idEmEdicao, dadosDoFormulario) : api.fila.criar(dadosDoFormulario);
    salvando = true;

    pedido
      .then(function (registro) {
        ui.mostrarToast(estavaEditando ? 'Alterações salvas.' : 'Paciente adicionado à fila.');
        // A lista passa a mostrar a fila onde a pessoa entrou
        filtroEspecialidade.value = String(registro.especialidadeId);
        filtroUbs.value = String(registro.ubsId);
        voltarParaCadastro();
        return carregarFila();
      })
      .catch(function (erro) {
        if (erro.campo) {
          var errosDaApi = {};
          errosDaApi[erro.campo] = erro.message;
          ui.mostrarErros(formulario, errosDaApi);
        } else {
          avisoDoFormulario.textContent = erro.message;
        }
      })
      .then(function () {
        salvando = false;
      });
  }

  function validarCampoAoSair(evento) {
    if (!jaTentouEnviar) {
      return;
    }
    var bloco = evento.target.closest('[data-campo]');
    if (!bloco) {
      return;
    }
    var campo = bloco.getAttribute('data-campo');
    var erros = validacao.validarRegistroFila(lerFormulario(), new Date());
    ui.mostrarErroNoCampo(formulario, campo, erros[campo] || null);
  }

  /* =====================================================================
     Lista
     ===================================================================== */

  /* Monta a lista na ordem do encaixe. Pessoas de filas diferentes
     (outra especialidade ou outra UBS) não disputam a mesma vaga, então
     primeiro agrupamos por especialidade e UBS, e dentro de cada grupo
     usamos a mesma comparação do encaixe: regras.compararCandidatos. */
  function filaOrdenada() {
    var hoje = new Date();
    var especialidadeId = Number(filtroEspecialidade.value) || null;
    var ubsId = Number(filtroUbs.value) || null;

    var itens = dados.fila.filter(function (registro) {
      return registro.status === 'AGUARDANDO' &&
        (especialidadeId === null || registro.especialidadeId === especialidadeId) &&
        (ubsId === null || registro.ubsId === ubsId);
    }).map(function (registro) {
      var paciente = porId(dados.pacientes, registro.pacienteId);
      var ubs = porId(dados.ubs, registro.ubsId);
      return {
        registroFila: registro,
        paciente: paciente,
        especialidade: porId(dados.especialidades, registro.especialidadeId),
        ubs: ubs,
        idade: datas.calcularIdade(paciente.dataNascimento, hoje),
        temPrioridadeLegal: regras.temPrioridadeLegal(paciente, hoje),
        moraNoBairro: paciente.bairro === ubs.bairro
      };
    });

    itens.sort(function (a, b) {
      var porEspecialidade = a.especialidade.nome.localeCompare(b.especialidade.nome, 'pt-BR');
      if (porEspecialidade !== 0) { return porEspecialidade; }
      var porUbs = a.ubs.nome.localeCompare(b.ubs.nome, 'pt-BR');
      if (porUbs !== 0) { return porUbs; }
      return regras.compararCandidatos(a, b);
    });

    // Posição dentro de cada grupo (1º, 2º, ...)
    var grupoAnterior = '';
    var posicao = 0;
    itens.forEach(function (item) {
      var grupo = item.especialidade.id + '-' + item.ubs.id;
      posicao = grupo === grupoAnterior ? posicao + 1 : 1;
      grupoAnterior = grupo;
      item.posicao = posicao;
    });
    return itens;
  }

  function htmlDaLinha(item) {
    var registro = item.registroFila;
    var detalhes = [item.idade + ' anos'];
    if (item.temPrioridadeLegal) { detalhes.push('prioridade legal'); }
    if (item.moraNoBairro) { detalhes.push('mora no bairro da UBS'); }
    var naoAceita = item.paciente.aceitaEncaixe ? '' :
      '<span class="anotacao">Não aceita encaixe: fica de fora das vagas em cima da hora</span>';

    return '<tr>' +
      '<td data-label="Posição" class="fila__posicao numero">' + item.posicao + 'º</td>' +
      '<th scope="row"><span class="tabela__nome">' + e(item.paciente.nome) + '</span>' +
        '<span class="tabela__detalhe">' + e(detalhes.join(', ')) + '</span>' + naoAceita + '</th>' +
      '<td data-label="Especialidade e UBS">' + e(item.especialidade.nome) +
        '<span class="tabela__detalhe">' + e(item.ubs.nome) + '</span></td>' +
      '<td data-label="Risco"><span class="risco risco--' + registro.classificacaoRisco.toLowerCase() + '">' +
        e(Encaixe.textos.classificacaoRisco[registro.classificacaoRisco]) + '</span></td>' +
      '<td data-label="Na fila desde"><span class="numero">' + e(formatar.dataCurta(registro.dataEntrada)) + '</span>' +
        '<span class="tabela__detalhe numero">' + e(formatar.tempoDesde(registro.dataEntrada)) + '</span></td>' +
      '<td class="tabela__acoes">' +
        '<button class="botao botao--secundario botao--compacto" type="button" data-acao="editar" data-id="' + registro.id + '">' +
          'Editar<span class="so-leitor"> ' + e(item.paciente.nome) + '</span></button>' +
        '<button class="botao botao--perigoso botao--compacto" type="button" data-acao="remover" data-id="' + registro.id + '">' +
          'Remover da fila<span class="so-leitor"> ' + e(item.paciente.nome) + '</span></button>' +
      '</td>' +
    '</tr>';
  }

  function mostrarLista() {
    var itens = filaOrdenada();
    corpoDaTabela.innerHTML = itens.map(htmlDaLinha).join('');
    molduraDaTabela.hidden = itens.length === 0;
    listaVazia.hidden = itens.length > 0;
    listaVazia.textContent = 'Ninguém aguardando nesta fila. Para incluir alguém, use o formulário acima.';
    contagem.textContent = itens.length === 1 ? '1 pessoa aguardando' : itens.length + ' pessoas aguardando';
  }

  function carregarFila() {
    return api.fila.listar().then(function (fila) {
      dados.fila = fila;
      mostrarLista();
    }).catch(function (erro) {
      ui.mostrarToast(erro.message, 'erro');
    });
  }

  function cliqueNaTabela(evento) {
    var botao = evento.target.closest('button[data-acao]');
    if (!botao) {
      return;
    }
    var registro = porId(dados.fila, Number(botao.getAttribute('data-id')));
    if (!registro) {
      return;
    }
    if (botao.getAttribute('data-acao') === 'editar') {
      comecarEdicao(registro);
    } else {
      abrirRemocao(registro);
    }
  }

  /* ---------- Remover da fila ---------- */
  function abrirRemocao(registro) {
    var paciente = porId(dados.pacientes, registro.pacienteId);
    var especialidade = porId(dados.especialidades, registro.especialidadeId);
    idParaRemover = registro.id;
    document.getElementById('dialog-remover-titulo').textContent =
      'Remover ' + paciente.nome + ' da fila de ' + especialidade.nome + '?';
    dialogRemover.showModal();
  }

  function confirmarRemocao(evento) {
    if (!evento.submitter || evento.submitter.value !== 'remover') {
      return;   // "Manter na fila": o dialog fecha sozinho
    }
    var id = idParaRemover;
    api.fila.excluir(id)
      .then(function () {
        ui.mostrarToast('Paciente removido da fila.');
        if (idEmEdicao === id) {
          voltarParaCadastro();
        }
        return carregarFila();
      })
      .then(function () {
        tituloDaLista.focus();
      })
      .catch(function (erro) {
        ui.mostrarToast(erro.message, 'erro');
      });
  }

  /* =====================================================================
     Início
     ===================================================================== */
  function iniciar() {
    Promise.all([api.pacientes.listar(), api.especialidades.listar(), api.ubs.listar()])
      .then(function (respostas) {
        dados.pacientes = respostas[0];
        dados.especialidades = respostas[1];
        dados.ubs = respostas[2];

        formulario.elements.especialidadeId.innerHTML = opcoesHtml(dados.especialidades, 'Escolha a especialidade');
        formulario.elements.ubsId.innerHTML = opcoesHtml(dados.ubs, 'Escolha a UBS');
        filtroEspecialidade.innerHTML = opcoesHtml(dados.especialidades, 'Todas');
        filtroUbs.innerHTML = opcoesHtml(dados.ubs, 'Todas');
        // Começa mostrando a fila do pitch: Ortopedia na UBS Jardim das Flores
        filtroEspecialidade.value = '1';
        filtroUbs.value = '1';

        formulario.elements.dataEntrada.max = datas.paraIsoData(new Date());
        voltarParaCadastro();
        return carregarFila();
      })
      .catch(function (erro) {
        ui.mostrarToast(erro.message, 'erro');
      });

    formulario.addEventListener('submit', enviarFormulario);
    formulario.addEventListener('focusout', validarCampoAoSair);
    formulario.addEventListener('change', validarCampoAoSair);
    botaoCancelarEdicao.addEventListener('click', voltarParaCadastro);
    buscaPaciente.addEventListener('input', mostrarPacientesDaBusca);
    filtroEspecialidade.addEventListener('change', mostrarLista);
    filtroUbs.addEventListener('change', mostrarLista);
    corpoDaTabela.addEventListener('click', cliqueNaTabela);
    document.getElementById('formulario-remover').addEventListener('submit', confirmarRemocao);
  }

  iniciar();
})();
