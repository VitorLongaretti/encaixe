/* =====================================================================
   minha-consulta.js: página do cidadão

   Um passo de cada vez:
     1. A pessoa digita o cartão SUS
     2. Vê a próxima consulta e escolhe "Confirmar consulta" ou
        "Não vou poder ir"
     3. Para cancelar, confirma mais uma vez (para não cancelar sem querer)
     4. Vê a mensagem final

   Por privacidade, a página não mostra o nome da pessoa nem dados de
   saúde: só o dia, o horário, o local e a especialidade.
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

(function () {
  var api = Encaixe.api;
  var ui = Encaixe.ui;
  var formatar = Encaixe.formatar;
  var regras = Encaixe.regras;
  var validacao = Encaixe.validacao;
  var e = ui.escaparHtml;

  var passoCartao = document.getElementById('passo-cartao');
  var passoConsulta = document.getElementById('passo-consulta');
  var formularioCartao = document.getElementById('formulario-cartao');
  var campoCartao = document.getElementById('campo-cartao');

  var listas = { ubs: [], especialidades: [] };
  var consultaAtual = null;
  var jaTentouEnviar = false;

  function porId(lista, id) {
    return lista.filter(function (item) { return item.id === id; })[0] || null;
  }

  function primeiraMaiuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  // Troca o conteúdo do passo 2 e leva o foco (e o leitor de tela) para o título
  function mostrarPasso(html) {
    passoCartao.hidden = true;
    passoConsulta.hidden = false;
    passoConsulta.innerHTML = html;
    var titulo = document.getElementById('consulta-titulo');
    if (titulo) {
      titulo.focus();
    }
  }

  function botaoOutroCartao() {
    return '<button class="link-botao cidadao__voltar" type="button" data-acao="outro-cartao">Usar outro cartão SUS</button>';
  }

  // "terça-feira, 10 de novembro, às 9h20" + o local
  function descricaoDaConsulta(consulta) {
    var ubs = porId(listas.ubs, consulta.ubsId);
    return ubs.nome + ', ' + formatar.dataHoraPorExtenso(consulta.dataHora);
  }

  /* ---------- Passo 2: a próxima consulta ---------- */
  function mostrarConsulta(consulta) {
    consultaAtual = consulta;
    var ubs = porId(listas.ubs, consulta.ubsId);
    var especialidade = porId(listas.especialidades, consulta.especialidadeId);
    var jaConfirmada = consulta.status === 'CONFIRMADA';

    var html = '<h2 class="cidadao__titulo" id="consulta-titulo" tabindex="-1">Sua próxima consulta</h2>' +
      '<dl class="ficha">' +
        '<div class="ficha__linha"><dt>Dia</dt><dd>' + e(primeiraMaiuscula(formatar.diaPorExtenso(consulta.dataHora))) + '</dd></div>' +
        '<div class="ficha__linha"><dt>Horário</dt><dd class="numero">' + e(formatar.hora(consulta.dataHora)) + '</dd></div>' +
        '<div class="ficha__linha"><dt>Especialidade</dt><dd>' + e(especialidade.nome) + '</dd></div>' +
        '<div class="ficha__linha"><dt>Local</dt><dd>' + e(ubs.nome) + '<span class="ficha__detalhe">' + e(ubs.endereco) + '</span></dd></div>' +
      '</dl>';

    if (jaConfirmada) {
      html = html + '<p class="cidadao__aviso cidadao__aviso--ok">' + Encaixe.icone('check') + '<span>Você já confirmou esta consulta.</span></p>';
    } else {
      html = html + '<button class="botao botao--primario botao--grande" type="button" data-acao="confirmar">Confirmar consulta</button>';
    }

    html = html +
      '<button class="botao botao--perigoso botao--grande" type="button" data-acao="nao-vou">Não vou poder ir</button>' +
      '<p class="cidadao__explica">Se você não puder ir, cancele aqui. Sua vaga vai para alguém que está esperando na fila.</p>' +
      botaoOutroCartao();

    mostrarPasso(html);
  }

  function mostrarSemConsulta() {
    consultaAtual = null;
    mostrarPasso(
      '<h2 class="cidadao__titulo" id="consulta-titulo" tabindex="-1">Você não tem consulta marcada</h2>' +
      '<p>Quando a UBS marcar uma consulta para você, ela aparece aqui.</p>' +
      botaoOutroCartao()
    );
  }

  /* ---------- Passo 3: confirmar o cancelamento ---------- */
  function perguntarCancelamento() {
    mostrarPasso(
      '<h2 class="cidadao__titulo" id="consulta-titulo" tabindex="-1">Cancelar a consulta?</h2>' +
      '<p class="cidadao__destaque">' + e(primeiraMaiuscula(descricaoDaConsulta(consultaAtual))) + '.</p>' +
      '<p>A vaga vai para alguém que está esperando na fila. Se precisar de outra consulta, procure a recepção da sua UBS.</p>' +
      '<button class="botao botao--perigoso botao--grande" type="button" data-acao="cancelar">Sim, cancelar a consulta</button>' +
      '<button class="botao botao--secundario botao--grande" type="button" data-acao="voltar">Voltar</button>'
    );
  }

  /* ---------- Passo 4: a mensagem final ---------- */
  function mostrarResultado(titulo, texto) {
    mostrarPasso(
      '<div class="cidadao__resultado">' +
        Encaixe.icone('check') +
        '<h2 class="cidadao__titulo" id="consulta-titulo" tabindex="-1">' + e(titulo) + '</h2>' +
      '</div>' +
      '<p class="cidadao__destaque">' + e(texto) + '</p>' +
      botaoOutroCartao()
    );
  }

  function confirmar() {
    var consulta = consultaAtual;
    api.consultas.confirmar(consulta.id).then(function () {
      var ubs = porId(listas.ubs, consulta.ubsId);
      mostrarResultado('Consulta confirmada.',
        'Te esperamos na ' + ubs.nome + ', ' + formatar.dataHoraPorExtenso(consulta.dataHora) + '.');
    }).catch(function (erro) {
      ui.mostrarToast(erro.message, 'erro');
    });
  }

  function cancelar() {
    api.consultas.cancelar(consultaAtual.id).then(function () {
      mostrarResultado('Consulta cancelada.',
        'Obrigado por avisar. Sua vaga vai para quem está esperando na fila.');
    }).catch(function (erro) {
      ui.mostrarToast(erro.message, 'erro');
    });
  }

  function voltarAoCartao() {
    consultaAtual = null;
    passoConsulta.hidden = true;
    passoConsulta.innerHTML = '';
    passoCartao.hidden = false;
    formularioCartao.reset();
    ui.limparErros(formularioCartao);
    jaTentouEnviar = false;
    campoCartao.focus();
  }

  /* ---------- Passo 1: o cartão ---------- */
  function buscarConsulta(evento) {
    evento.preventDefault();
    jaTentouEnviar = true;
    var erro = validacao.validarCartaoSus(campoCartao.value);
    if (ui.mostrarErros(formularioCartao, erro ? { cartaoSus: erro } : {})) {
      return;
    }
    api.consultas.buscarPorCartaoSus(campoCartao.value).then(function (consultas) {
      // A próxima consulta: a primeira agendada ou confirmada que ainda não passou
      var agora = new Date();
      var proxima = consultas.filter(function (consulta) {
        return regras.estaAtiva(consulta) && !regras.jaPassou(consulta, agora);
      })[0];
      if (proxima) {
        mostrarConsulta(proxima);
      } else {
        mostrarSemConsulta();
      }
    }).catch(function (erroDaApi) {
      ui.mostrarErros(formularioCartao, { cartaoSus: erroDaApi.message });
    });
  }

  function cliqueNoPasso(evento) {
    var botao = evento.target.closest('button[data-acao]');
    if (!botao) {
      return;
    }
    var acao = botao.getAttribute('data-acao');
    if (acao === 'confirmar') { confirmar(); }
    if (acao === 'nao-vou') { perguntarCancelamento(); }
    if (acao === 'cancelar') { cancelar(); }
    if (acao === 'voltar') { mostrarConsulta(consultaAtual); }
    if (acao === 'outro-cartao') { voltarAoCartao(); }
  }

  function iniciar() {
    ui.ligarMascara(campoCartao, formatar.cartaoSus);
    formularioCartao.addEventListener('submit', buscarConsulta);
    campoCartao.addEventListener('blur', function () {
      if (jaTentouEnviar) {
        ui.mostrarErroNoCampo(formularioCartao, 'cartaoSus', validacao.validarCartaoSus(campoCartao.value));
      }
    });
    passoConsulta.addEventListener('click', cliqueNoPasso);

    Promise.all([api.ubs.listar(), api.especialidades.listar()]).then(function (respostas) {
      listas.ubs = respostas[0];
      listas.especialidades = respostas[1];
    });
  }

  iniciar();
})();
