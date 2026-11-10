/* =====================================================================
   ui.js: componentes comuns a todas as páginas

     Encaixe.icone      ícones SVG inline (não usamos sprite externo,
                        que não funciona em file://)
     Encaixe.formatar   datas por extenso, horários, CPF, cartão, telefone
     Encaixe.textos     rótulos em português dos valores do banco
     Encaixe.ui         status visual, toasts, máscaras e escape de HTML
     + menu do celular e dialog de "Restaurar dados", iniciados no fim

   Não usamos módulos (import/export) porque o Chrome bloqueia módulos
   em file://. Tudo é compartilhado pelo objeto global window.Encaixe.
   ===================================================================== */
window.Encaixe = window.Encaixe || {};


/* ---------------------------------------------------------------------
   Ícones: traço de 1.75px, 20px, cantos arredondados (o tamanho e o
   traço vêm da classe .icone no CSS). Todos são decorativos, por isso
   levam aria-hidden: o texto ao lado é que diz o que significam.
   --------------------------------------------------------------------- */
(function () {
  var DESENHOS = {
    relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M7 7l10 10M17 7L7 17"/>',
    calendario: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    pessoa: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
    fila: '<circle cx="6" cy="8.5" r="2.2"/><circle cx="12" cy="8.5" r="2.2"/><circle cx="18" cy="8.5" r="2.2"/><path d="M3 17c.4-2.2 1.5-3.4 3-3.4s2.6 1.2 3 3.4M9 17c.4-2.2 1.5-3.4 3-3.4s2.6 1.2 3 3.4M15 17c.4-2.2 1.5-3.4 3-3.4s2.6 1.2 3 3.4"/>',
    grafico: '<path d="M4 6.5h9M4 12h15M4 17.5h6"/>',
    telefone: '<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 6a2 2 0 0 1 2-2z"/>',
    setaEsquerda: '<path d="M14.5 6l-6 6 6 6"/>',
    setaDireita: '<path d="M9.5 6l6 6-6 6"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    lixeira: '<path d="M4.5 7h15M10 4h4M6.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l1-12.5M10 11v6M14 11v6"/>'
  };

  // Encaixe.icone('check') → '<svg class="icone" ...>...</svg>'
  Encaixe.icone = function (nome) {
    var desenho = DESENHOS[nome];
    if (!desenho) {
      return '';
    }
    return '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + desenho + '</svg>';
  };
})();


/* ---------------------------------------------------------------------
   Formatação para a tela
   --------------------------------------------------------------------- */
Encaixe.formatar = (function () {

  // Intl.DateTimeFormat já sabe escrever datas em português
  var formatoDiaPorExtenso = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  var formatoDataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  var formatoDiaEMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

  function paraData(valor) {
    return typeof valor === 'string' ? Encaixe.datas.paraData(valor) : valor;
  }

  // "terça-feira, 10 de novembro"
  function diaPorExtenso(valor) {
    return formatoDiaPorExtenso.format(paraData(valor));
  }

  // "9h20" (e "9h" quando os minutos são zero), como as pessoas falam
  function hora(valor) {
    var data = paraData(valor);
    var minutos = data.getMinutes();
    return data.getHours() + 'h' + (minutos === 0 ? '' : String(minutos).padStart(2, '0'));
  }

  // "09:20", para a coluna de horários da agenda (alinhada em tabular-nums)
  function horaDaAgenda(valor) {
    var data = paraData(valor);
    return String(data.getHours()).padStart(2, '0') + ':' + String(data.getMinutes()).padStart(2, '0');
  }

  // "terça-feira, 10 de novembro, às 9h20"
  function dataHoraPorExtenso(valor) {
    return diaPorExtenso(valor) + ', às ' + hora(valor);
  }

  // "10/11/2026"
  function dataCurta(valor) {
    return formatoDataCurta.format(paraData(valor));
  }

  // "10/11"
  function diaEMes(valor) {
    return formatoDiaEMes.format(paraData(valor));
  }

  // Tempo desde uma data ISO até hoje: "14 meses e 3 dias", "1 mês", "20 dias"
  function tempoDesde(dataIso, hoje) {
    var tempo = Encaixe.datas.tempoEntre(dataIso, hoje || new Date());
    var partes = [];
    if (tempo.meses > 0) {
      partes.push(tempo.meses + (tempo.meses === 1 ? ' mês' : ' meses'));
    }
    if (tempo.dias > 0 || tempo.meses === 0) {
      partes.push(tempo.dias + (tempo.dias === 1 ? ' dia' : ' dias'));
    }
    return partes.join(' e ');
  }

  // "Maria Aparecida Souza" → "Maria Aparecida" (para mensagens curtas)
  function nomeCurto(nome) {
    return String(nome).split(' ').slice(0, 2).join(' ');
  }

  // 0.254 → "25%"
  function porcentagem(fracao) {
    return Math.round(fracao * 100) + '%';
  }

  /* Máscaras: funcionam também com o número pela metade, enquanto a
     pessoa digita. Ex.: "1234" → "123.4" */
  function cpf(valor) {
    var n = Encaixe.validacao.somenteDigitos(valor).slice(0, 11);
    var texto = n.slice(0, 3);
    if (n.length > 3) { texto = texto + '.' + n.slice(3, 6); }
    if (n.length > 6) { texto = texto + '.' + n.slice(6, 9); }
    if (n.length > 9) { texto = texto + '-' + n.slice(9); }
    return texto;
  }

  // "898001234567890" → "898 0012 3456 7890"
  function cartaoSus(valor) {
    var n = Encaixe.validacao.somenteDigitos(valor).slice(0, 15);
    var texto = n.slice(0, 3);
    if (n.length > 3) { texto = texto + ' ' + n.slice(3, 7); }
    if (n.length > 7) { texto = texto + ' ' + n.slice(7, 11); }
    if (n.length > 11) { texto = texto + ' ' + n.slice(11); }
    return texto;
  }

  // "11912345678" → "(11) 91234-5678"; "1123456789" → "(11) 2345-6789"
  function telefone(valor) {
    var n = Encaixe.validacao.somenteDigitos(valor).slice(0, 11);
    if (n.length === 0) { return ''; }
    if (n.length <= 2) { return '(' + n; }
    var ddd = n.slice(0, 2);
    var numero = n.slice(2);
    // com 11 números, o celular tem 5 antes do traço; com 10, o fixo tem 4
    var antesDoTraco = n.length === 11 ? 5 : 4;
    if (numero.length <= antesDoTraco) {
      return '(' + ddd + ') ' + numero;
    }
    return '(' + ddd + ') ' + numero.slice(0, antesDoTraco) + '-' + numero.slice(antesDoTraco);
  }

  return {
    diaPorExtenso: diaPorExtenso,
    hora: hora,
    horaDaAgenda: horaDaAgenda,
    dataHoraPorExtenso: dataHoraPorExtenso,
    dataCurta: dataCurta,
    diaEMes: diaEMes,
    tempoDesde: tempoDesde,
    nomeCurto: nomeCurto,
    porcentagem: porcentagem,
    cpf: cpf,
    cartaoSus: cartaoSus,
    telefone: telefone
  };
})();


/* ---------------------------------------------------------------------
   Rótulos em português para os valores gravados no banco.
   O banco guarda "TRANSPORTE"; a tela mostra "Transporte".
   --------------------------------------------------------------------- */
Encaixe.textos = {
  motivoFalta: {
    ESQUECIMENTO: 'Esquecimento',
    TRANSPORTE: 'Transporte',
    TRABALHO: 'Trabalho',
    SAUDE: 'Problema de saúde',
    OUTRO: 'Outro motivo'
  },
  contatoPreferido: {
    TELEFONE: 'Ligação',
    WHATSAPP: 'WhatsApp',
    SMS: 'SMS'
  },
  classificacaoRisco: {
    ALTA: 'Alto',
    MEDIA: 'Médio',
    BAIXA: 'Baixo'
  }
};


/* ---------------------------------------------------------------------
   Encaixe.ui
   --------------------------------------------------------------------- */
Encaixe.ui = (function () {

  var TEMPO_DO_TOAST_EM_MS = 5000;
  var CHAVE_TOAST_PENDENTE = 'encaixe-toast-pendente';

  // Tudo o que vem do usuário passa por aqui antes de entrar no HTML.
  // Sem isso, um nome como "<b>Ana</b>" viraria código na página.
  function escaparHtml(texto) {
    return String(texto === undefined || texto === null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Como cada consulta aparece na tela: sempre cor + ícone + texto.
     Devolve { chave, texto, icone }. A "chave" vira a classe CSS
     (status--confirmada, status--nao-confirmada...). */
  function statusVisual(consulta, agora) {
    agora = agora || new Date();
    if (consulta.status === 'CONFIRMADA' && consulta.origem === 'ENCAIXE') {
      return { chave: 'encaixe', texto: 'Encaixe', icone: 'mais' };
    }
    if (consulta.status === 'AGENDADA') {
      if (Encaixe.regras.estaNaoConfirmada(consulta, agora)) {
        return { chave: 'nao-confirmada', texto: 'Não confirmada', icone: 'relogio' };
      }
      return { chave: 'agendada', texto: 'Agendada', icone: 'calendario' };
    }
    if (consulta.status === 'CONFIRMADA') {
      return { chave: 'confirmada', texto: 'Confirmada', icone: 'check' };
    }
    if (consulta.status === 'FALTA') {
      return { chave: 'faltou', texto: 'Faltou', icone: 'x' };
    }
    if (consulta.status === 'REALIZADA') {
      return { chave: 'atendida', texto: 'Atendida', icone: 'pessoa' };
    }
    // CANCELADA: se ainda não passou, o horário é uma vaga livre
    if (!Encaixe.regras.jaPassou(consulta, agora)) {
      return { chave: 'vaga', texto: 'Vaga livre', icone: '' };
    }
    return { chave: 'cancelada', texto: 'Cancelada', icone: 'x' };
  }

  // O HTML do status, pronto para colocar na página
  function htmlDoStatus(consulta, agora) {
    var status = statusVisual(consulta, agora);
    if (status.chave === 'vaga') {
      return '<span class="vaga-livre">Vaga livre</span>';
    }
    return '<span class="status status--' + status.chave + '">' + Encaixe.icone(status.icone) + escaparHtml(status.texto) + '</span>';
  }

  /* ---------- Toasts ----------
     Ficam numa região com role="status" e aria-live="polite": o leitor
     de tela lê a mensagem sem interromper o que a pessoa está fazendo.
     A região é criada assim que a página carrega, porque o leitor de
     tela só "escuta" regiões que já existiam antes da mensagem chegar. */
  function regiaoDosToasts() {
    var regiao = document.getElementById('toasts');
    if (!regiao) {
      regiao = document.createElement('div');
      regiao.id = 'toasts';
      regiao.className = 'toasts';
      regiao.setAttribute('role', 'status');
      regiao.setAttribute('aria-live', 'polite');
      document.body.appendChild(regiao);
    }
    return regiao;
  }

  // tipo: 'sucesso' (padrão), 'erro' ou 'encaixe'
  function mostrarToast(mensagem, tipo) {
    tipo = tipo || 'sucesso';
    var icones = { sucesso: 'check', erro: 'x', encaixe: 'mais' };
    var toast = document.createElement('div');
    toast.className = 'toast toast--' + tipo;
    toast.innerHTML = Encaixe.icone(icones[tipo]) + '<p class="toast__texto">' + escaparHtml(mensagem) + '</p>';
    regiaoDosToasts().appendChild(toast);
    setTimeout(function () {
      toast.remove();
    }, TEMPO_DO_TOAST_EM_MS);
  }

  // Guarda um toast para mostrar depois de recarregar a página
  function guardarToastParaDepois(mensagem) {
    try {
      window.sessionStorage.setItem(CHAVE_TOAST_PENDENTE, mensagem);
    } catch (erro) {
      // sem sessionStorage, a mensagem só não aparece: não é grave
    }
  }

  function mostrarToastGuardado() {
    try {
      var mensagem = window.sessionStorage.getItem(CHAVE_TOAST_PENDENTE);
      if (mensagem) {
        window.sessionStorage.removeItem(CHAVE_TOAST_PENDENTE);
        mostrarToast(mensagem);
      }
    } catch (erro) {
      // idem
    }
  }

  /* ---------- Máscaras de digitação ----------
     ligarMascara(campo, Encaixe.formatar.cpf) formata enquanto a pessoa digita. */
  function ligarMascara(campo, formatar) {
    campo.addEventListener('input', function () {
      campo.value = formatar(campo.value);
    });
  }

  /* ---------- Erros nos formulários ----------
     Cada campo do HTML fica dentro de um bloco com data-campo="nome",
     que tem um <p class="campo__erro"> vazio. O campo já aponta para esse
     <p> com aria-describedby, então, quando a mensagem aparece, o leitor
     de tela lê junto com o nome do campo. */
  function elementosDoBloco(bloco) {
    return bloco.querySelectorAll('input, select, textarea');
  }

  // mensagem = null limpa o erro do campo
  function mostrarErroNoCampo(formulario, campo, mensagem) {
    var bloco = formulario.querySelector('[data-campo="' + campo + '"]');
    if (!bloco) {
      return;
    }
    elementosDoBloco(bloco).forEach(function (elemento) {
      if (mensagem) {
        elemento.setAttribute('aria-invalid', 'true');
      } else {
        elemento.removeAttribute('aria-invalid');
      }
    });
    bloco.classList.toggle('campo--com-erro', Boolean(mensagem));
    var areaDoErro = bloco.querySelector('.campo__erro');
    if (areaDoErro) {
      areaDoErro.textContent = mensagem || '';
    }
  }

  // Recebe { campo: mensagem } (o formato do validacao.js) e atualiza todos
  // os campos do formulário. Se houver erro, coloca o foco no primeiro
  // campo inválido e devolve true.
  function mostrarErros(formulario, erros) {
    var primeiroBlocoComErro = null;
    formulario.querySelectorAll('[data-campo]').forEach(function (bloco) {
      var campo = bloco.getAttribute('data-campo');
      mostrarErroNoCampo(formulario, campo, erros[campo] || null);
      if (erros[campo] && primeiroBlocoComErro === null) {
        primeiroBlocoComErro = bloco;
      }
    });
    if (primeiroBlocoComErro) {
      elementosDoBloco(primeiroBlocoComErro)[0].focus();
      return true;
    }
    return false;
  }

  function limparErros(formulario) {
    mostrarErros(formulario, {});
  }

  /* ---------- Busca ----------
     "José" e "jose" têm que dar o mesmo resultado: tiramos os acentos
     (normalize separa a letra do acento, e o replace apaga o acento)
     e passamos tudo para minúsculas. */
  function textoParaBusca(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  return {
    mostrarErroNoCampo: mostrarErroNoCampo,
    mostrarErros: mostrarErros,
    limparErros: limparErros,
    textoParaBusca: textoParaBusca,
    escaparHtml: escaparHtml,
    statusVisual: statusVisual,
    htmlDoStatus: htmlDoStatus,
    regiaoDosToasts: regiaoDosToasts,
    mostrarToast: mostrarToast,
    guardarToastParaDepois: guardarToastParaDepois,
    mostrarToastGuardado: mostrarToastGuardado,
    ligarMascara: ligarMascara
  };
})();


/* ---------------------------------------------------------------------
   Iniciado em todas as páginas
   --------------------------------------------------------------------- */
(function () {

  /* ---------- Menu do celular ----------
     Abaixo de 720px, o CSS esconde os links atrás do botão "Menu".
     Este código só abre e fecha, e mantém o aria-expanded certo para
     o leitor de tela anunciar "expandido" ou "recolhido". */
  function iniciarMenuMobile() {
    var botao = document.querySelector('.menu-botao');
    var menu = document.getElementById('menu-principal');
    if (!botao || !menu) {
      return;
    }

    function abrirOuFechar(abrir) {
      botao.setAttribute('aria-expanded', String(abrir));
      menu.classList.toggle('esta-aberto', abrir);
    }

    botao.addEventListener('click', function () {
      var estaAberto = botao.getAttribute('aria-expanded') === 'true';
      abrirOuFechar(!estaAberto);
    });

    // Esc fecha o menu e devolve o foco para o botão, para quem usa teclado
    document.addEventListener('keydown', function (evento) {
      var estaAberto = botao.getAttribute('aria-expanded') === 'true';
      if (evento.key === 'Escape' && estaAberto) {
        abrirOuFechar(false);
        botao.focus();
      }
    });
  }

  /* ---------- Dialog de "Restaurar dados de demonstração" ----------
     showModal() abre a janela por cima da página, prende o foco dentro
     dela e deixa fechar com Esc, tudo nativo do navegador. */
  function iniciarDialogRestaurar() {
    var dialog = document.getElementById('dialog-restaurar');
    var botaoAbrir = document.querySelector('[data-abrir-dialog="dialog-restaurar"]');
    if (!dialog || !botaoAbrir) {
      return;
    }

    botaoAbrir.addEventListener('click', function () {
      dialog.showModal();
    });

    // O <form method="dialog"> fecha a janela sozinho. evento.submitter é o
    // botão clicado: só restauramos se foi "Restaurar dados".
    // (Com Esc, a janela fecha sem enviar o formulário.)
    dialog.querySelector('form').addEventListener('submit', function (evento) {
      if (!evento.submitter || evento.submitter.value !== 'restaurar') {
        return;
      }
      Encaixe.api.restaurarDadosExemplo()
        .then(function () {
          // Recarregamos a página para todas as listas mostrarem os dados
          // novos. O toast fica guardado e aparece depois do recarregamento.
          Encaixe.ui.guardarToastParaDepois('Dados de demonstração restaurados.');
          window.location.reload();
        })
        .catch(function (erro) {
          Encaixe.ui.mostrarToast(erro.message, 'erro');
        });
    });
  }

  /* ---------- Ícones escritos no HTML ----------
     <span data-icone="mais"></span> vira o SVG do ícone "mais".
     Assim o HTML das páginas não precisa repetir o desenho de cada ícone. */
  function preencherIcones() {
    document.querySelectorAll('[data-icone]').forEach(function (elemento) {
      elemento.outerHTML = Encaixe.icone(elemento.getAttribute('data-icone'));
    });
  }

  // Os scripts têm "defer": rodam depois que o HTML inteiro foi lido,
  // então os elementos já existem e podemos iniciar direto.
  preencherIcones();
  Encaixe.ui.regiaoDosToasts();
  iniciarMenuMobile();
  iniciarDialogRestaurar();
  Encaixe.ui.mostrarToastGuardado();
})();
