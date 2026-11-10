/* =====================================================================
   pacientes.js: página Pacientes (CRUD completo)

   É o modelo de qualidade das outras telas. O caminho é sempre o mesmo:
     1. Ler o formulário
     2. Validar no navegador (validacao.js) e mostrar os erros nos campos
     3. Chamar Encaixe.api, que valida de novo e grava
     4. Mostrar o toast e atualizar a lista
   A página nunca mexe no localStorage: ela só conversa com Encaixe.api.
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

(function () {
  var api = Encaixe.api;
  var ui = Encaixe.ui;
  var formatar = Encaixe.formatar;
  var validacao = Encaixe.validacao;
  var regras = Encaixe.regras;
  var datas = Encaixe.datas;

  /* ---------- Elementos da página ---------- */
  var formulario = document.getElementById('formulario-paciente');
  var tituloDoFormulario = document.getElementById('formulario-titulo');
  var botaoSalvar = document.getElementById('botao-salvar');
  var botaoCancelarEdicao = document.getElementById('botao-cancelar-edicao');
  var avisoDoFormulario = document.getElementById('aviso-formulario');

  var tituloDaLista = document.getElementById('lista-titulo');
  var campoBusca = document.getElementById('campo-busca');
  var contagem = document.getElementById('contagem');
  var molduraDaTabela = document.getElementById('moldura-tabela');
  var corpoDaTabela = document.getElementById('lista-pacientes');
  var listaVazia = document.getElementById('lista-vazia');

  var dialogExcluir = document.getElementById('dialog-excluir');
  var formularioExcluir = document.getElementById('formulario-excluir');
  var textoExcluir = document.getElementById('dialog-excluir-texto');
  var erroExcluir = document.getElementById('dialog-excluir-erro');
  var botaoManter = document.getElementById('botao-manter');
  var botaoExcluir = document.getElementById('botao-excluir');

  /* ---------- Estado da página ---------- */
  var pacientes = [];          // a lista que veio da api
  var idEmEdicao = null;       // null = cadastrando um paciente novo
  var jaTentouEnviar = false;  // depois do primeiro envio com erro, valida também no blur
  var salvando = false;        // evita salvar duas vezes com dois cliques rápidos
  var idParaExcluir = null;

  /* =====================================================================
     Formulário
     ===================================================================== */

  // Pega os valores dos campos no formato que a api espera
  function lerFormulario() {
    var campos = formulario.elements;
    return {
      nome: campos.nome.value,
      cpf: campos.cpf.value,
      cartaoSus: campos.cartaoSus.value,
      dataNascimento: campos.dataNascimento.value,
      telefone: campos.telefone.value,
      bairro: campos.bairro.value,
      contatoPreferido: campos.contatoPreferido.value,   // o valor do rádio marcado ("" se nenhum)
      aceitaEncaixe: campos.aceitaEncaixe.checked,
      gestante: campos.gestante.checked,
      pcd: campos.pcd.checked
    };
  }

  function preencherFormulario(paciente) {
    var campos = formulario.elements;
    campos.nome.value = paciente.nome;
    campos.cpf.value = formatar.cpf(paciente.cpf);
    campos.cartaoSus.value = formatar.cartaoSus(paciente.cartaoSus);
    campos.dataNascimento.value = paciente.dataNascimento;
    campos.telefone.value = formatar.telefone(paciente.telefone);
    campos.bairro.value = paciente.bairro;
    campos.contatoPreferido.value = paciente.contatoPreferido;
    campos.aceitaEncaixe.checked = paciente.aceitaEncaixe;
    campos.gestante.checked = paciente.gestante;
    campos.pcd.checked = paciente.pcd;
  }

  // Volta o formulário para "Cadastrar paciente", vazio
  function voltarParaCadastro() {
    formulario.reset();
    ui.limparErros(formulario);
    avisoDoFormulario.textContent = '';
    idEmEdicao = null;
    jaTentouEnviar = false;
    tituloDoFormulario.textContent = 'Cadastrar paciente';
    botaoSalvar.textContent = 'Salvar paciente';
    botaoCancelarEdicao.hidden = true;
  }

  function comecarEdicao(paciente) {
    voltarParaCadastro();
    idEmEdicao = paciente.id;
    preencherFormulario(paciente);
    tituloDoFormulario.textContent = 'Editar paciente';
    botaoSalvar.textContent = 'Salvar alterações';
    botaoCancelarEdicao.hidden = false;
    // o foco leva a pessoa (e o leitor de tela) direto para o formulário
    formulario.elements.nome.focus();
  }

  function enviarFormulario(evento) {
    evento.preventDefault();
    if (salvando) {
      return;
    }
    jaTentouEnviar = true;
    avisoDoFormulario.textContent = '';

    var dados = lerFormulario();
    var erros = validacao.validarPaciente(dados, new Date());
    if (ui.mostrarErros(formulario, erros)) {
      return;   // tem erro: as mensagens já estão nos campos e o foco no primeiro
    }

    // Guardamos antes de chamar a api, porque voltarParaCadastro() zera idEmEdicao
    var estavaEditando = idEmEdicao !== null;
    var pedido = estavaEditando ? api.pacientes.atualizar(idEmEdicao, dados) : api.pacientes.criar(dados);
    salvando = true;

    pedido
      .then(function () {
        ui.mostrarToast(estavaEditando ? 'Alterações salvas.' : 'Paciente salvo.');
        voltarParaCadastro();
        return carregarPacientes();
      })
      .catch(function (erro) {
        // Erros como "CPF já cadastrado" vêm da api com o nome do campo
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

  // Depois da primeira tentativa de envio, cada campo é conferido quando a
  // pessoa sai dele (blur). "focusout" é o blur que sobe até o formulário,
  // então um único ouvinte cuida de todos os campos.
  function validarCampoAoSair(evento) {
    if (!jaTentouEnviar) {
      return;
    }
    var bloco = evento.target.closest('[data-campo]');
    if (!bloco) {
      return;
    }
    var campo = bloco.getAttribute('data-campo');
    var erros = validacao.validarPaciente(lerFormulario(), new Date());
    ui.mostrarErroNoCampo(formulario, campo, erros[campo] || null);
  }

  /* =====================================================================
     Lista
     ===================================================================== */

  function pacienteCombinaComBusca(paciente, busca) {
    if (busca === '') {
      return true;
    }
    if (ui.textoParaBusca(paciente.nome).indexOf(ui.textoParaBusca(busca)) !== -1) {
      return true;
    }
    // Para CPF e cartão, comparamos só os números: "123.456" acha "12345678901"
    var numerosDaBusca = validacao.somenteDigitos(busca);
    if (numerosDaBusca.length >= 3) {
      return paciente.cpf.indexOf(numerosDaBusca) !== -1 || paciente.cartaoSus.indexOf(numerosDaBusca) !== -1;
    }
    return false;
  }

  // As informações menores que aparecem embaixo do nome
  function detalhesDoPaciente(paciente, idade) {
    var detalhes = [];
    if (regras.temPrioridadeLegal(paciente)) {
      var motivos = [];
      if (idade >= 60) { motivos.push(idade + ' anos'); }
      if (paciente.gestante) { motivos.push('gestante'); }
      if (paciente.pcd) { motivos.push('PcD'); }
      detalhes.push('Prioridade legal: ' + motivos.join(', '));
    }
    detalhes.push(paciente.aceitaEncaixe ? 'Aceita encaixe' : 'Não aceita encaixe');
    return detalhes;
  }

  function htmlDaLinha(paciente) {
    var e = ui.escaparHtml;   // tudo que vem do cadastro passa pelo escape antes de virar HTML
    var idade = datas.calcularIdade(paciente.dataNascimento, new Date());
    var detalhes = detalhesDoPaciente(paciente, idade).map(function (texto) {
      return '<span class="tabela__detalhe">' + e(texto) + '</span>';
    }).join('');
    var contato = Encaixe.textos.contatoPreferido[paciente.contatoPreferido];

    return '<tr>' +
      '<th scope="row"><span class="tabela__nome">' + e(paciente.nome) + '</span>' + detalhes + '</th>' +
      '<td data-label="Documentos">' +
        '<span class="numero">CPF ' + e(formatar.cpf(paciente.cpf)) + '</span>' +
        '<span class="tabela__detalhe numero">SUS ' + e(formatar.cartaoSus(paciente.cartaoSus)) + '</span></td>' +
      '<td data-label="Nascimento"><span class="numero">' + e(formatar.dataCurta(paciente.dataNascimento)) + '</span>' +
        '<span class="tabela__detalhe">' + idade + ' anos</span></td>' +
      '<td data-label="Telefone"><span class="numero">' + e(formatar.telefone(paciente.telefone)) + '</span>' +
        '<span class="tabela__detalhe">Prefere ' + e(contato) + '</span></td>' +
      '<td data-label="Bairro">' + e(paciente.bairro) + '</td>' +
      '<td class="tabela__acoes">' +
        // O nome do paciente vai escondido no botão: quem usa leitor de tela
        // ouve "Editar Maria Aparecida Souza", e não só "Editar" várias vezes.
        '<button class="botao botao--secundario botao--compacto" type="button" data-acao="editar" data-id="' + paciente.id + '">' +
          'Editar<span class="so-leitor"> ' + e(paciente.nome) + '</span></button>' +
        '<button class="botao botao--perigoso botao--compacto" type="button" data-acao="excluir" data-id="' + paciente.id + '">' +
          'Excluir<span class="so-leitor"> ' + e(paciente.nome) + '</span></button>' +
      '</td>' +
    '</tr>';
  }

  function mostrarLista() {
    var busca = campoBusca.value.trim();
    var encontrados = pacientes.filter(function (paciente) {
      return pacienteCombinaComBusca(paciente, busca);
    });

    corpoDaTabela.innerHTML = encontrados.map(htmlDaLinha).join('');
    molduraDaTabela.hidden = encontrados.length === 0;
    listaVazia.hidden = encontrados.length > 0;

    // Telas vazias convidam a agir
    if (pacientes.length === 0) {
      listaVazia.textContent = 'Nenhum paciente cadastrado ainda. Comece pelo formulário acima.';
    } else if (encontrados.length === 0) {
      listaVazia.textContent = 'Nenhum paciente encontrado para "' + busca + '". Confira o nome ou os números.';
    }

    if (busca === '') {
      contagem.textContent = pacientes.length === 1 ? '1 paciente' : pacientes.length + ' pacientes';
    } else {
      contagem.textContent = encontrados.length + ' de ' + pacientes.length + ' pacientes';
    }
  }

  function carregarPacientes() {
    return api.pacientes.listar()
      .then(function (lista) {
        pacientes = lista;
        mostrarLista();
      })
      .catch(function (erro) {
        ui.mostrarToast(erro.message, 'erro');
      });
  }

  function buscarNaLista(id) {
    return pacientes.filter(function (paciente) { return paciente.id === id; })[0];
  }

  // Um ouvinte só para todos os botões da tabela ("delegação de eventos"):
  // as linhas são recriadas a cada busca, mas o <tbody> é sempre o mesmo.
  function cliqueNaTabela(evento) {
    var botao = evento.target.closest('button[data-acao]');
    if (!botao) {
      return;
    }
    var paciente = buscarNaLista(Number(botao.getAttribute('data-id')));
    if (!paciente) {
      return;
    }
    if (botao.getAttribute('data-acao') === 'editar') {
      comecarEdicao(paciente);
    } else {
      abrirExclusao(paciente);
    }
  }

  /* =====================================================================
     Exclusão
     ===================================================================== */

  function abrirExclusao(paciente) {
    idParaExcluir = paciente.id;
    document.getElementById('dialog-excluir-titulo').textContent = 'Excluir ' + paciente.nome + '?';
    textoExcluir.textContent = 'O cadastro será apagado. Isso não pode ser desfeito.';
    erroExcluir.textContent = '';
    botaoExcluir.hidden = false;
    botaoManter.textContent = 'Manter paciente';
    dialogExcluir.showModal();
  }

  function confirmarExclusao(evento) {
    // evento.submitter é o botão que a pessoa clicou
    if (!evento.submitter || evento.submitter.value !== 'excluir') {
      return;   // "Manter paciente": o <form method="dialog"> fecha sozinho
    }
    evento.preventDefault();   // segura a janela aberta até a api responder
    var id = idParaExcluir;

    api.pacientes.excluir(id)
      .then(function () {
        dialogExcluir.close();
        ui.mostrarToast('Paciente excluído.');
        if (idEmEdicao === id) {
          voltarParaCadastro();
        }
        return carregarPacientes();
      })
      .then(function () {
        // A linha do botão "Excluir" sumiu, então o foco vai para o título da lista
        tituloDaLista.focus();
      })
      .catch(function (erro) {
        // Regra 6: a explicação aparece dentro da janela, e só sobra o botão de fechar
        erroExcluir.textContent = erro.message;
        textoExcluir.textContent = '';
        botaoExcluir.hidden = true;
        botaoManter.textContent = 'Entendi';
        botaoManter.focus();
      });
  }

  /* =====================================================================
     Início
     ===================================================================== */
  function iniciar() {
    var campos = formulario.elements;
    ui.ligarMascara(campos.cpf, formatar.cpf);
    ui.ligarMascara(campos.cartaoSus, formatar.cartaoSus);
    ui.ligarMascara(campos.telefone, formatar.telefone);

    // Não deixa escolher nascimento no futuro nem há mais de 120 anos
    var hoje = new Date();
    campos.dataNascimento.max = datas.paraIsoData(hoje);
    campos.dataNascimento.min = datas.paraIsoData(datas.somarMeses(hoje, -120 * 12));

    formulario.addEventListener('submit', enviarFormulario);
    formulario.addEventListener('focusout', validarCampoAoSair);
    formulario.addEventListener('change', validarCampoAoSair);   // rádios e caixas de seleção
    botaoCancelarEdicao.addEventListener('click', voltarParaCadastro);

    campoBusca.addEventListener('input', mostrarLista);
    corpoDaTabela.addEventListener('click', cliqueNaTabela);
    formularioExcluir.addEventListener('submit', confirmarExclusao);

    carregarPacientes();
  }

  iniciar();
})();
