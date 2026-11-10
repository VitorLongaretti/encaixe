/* =====================================================================
   validacao.js: validadores dos formulários

   Cada função "validarX" devolve a mensagem de erro (texto) ou null
   quando o valor está certo. As mensagens dizem o que aconteceu e como
   resolver, sem pedir desculpa (seção 10 do briefing).

   As funções "validarPaciente", "validarRegistroFila" e "validarConsulta"
   juntam tudo e devolvem um objeto { campo: mensagem } só com os campos
   que têm erro. A página usa esse objeto para marcar cada campo, e o
   api.js usa o mesmo objeto para recusar dados errados (como o Java fará).

   As datas usam Encaixe.datas, que está em regras.js. Isso funciona porque
   estas funções só são chamadas depois que todos os scripts carregaram.
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

Encaixe.validacao = (function () {

  var BAIRROS = ['Itaquera', 'Guaianases', 'São Mateus', 'Cidade Tiradentes', 'José Bonifácio', 'Artur Alvim'];
  var CONTATOS = ['TELEFONE', 'WHATSAPP', 'SMS'];
  var RISCOS = ['ALTA', 'MEDIA', 'BAIXA'];

  // Primeiro e último horário de início de consulta (a última termina às 17h)
  var PRIMEIRO_HORARIO_EM_MINUTOS = 7 * 60;        // 7h00
  var ULTIMO_HORARIO_EM_MINUTOS = 16 * 60 + 40;    // 16h40

  /* ---------- Apoio ---------- */

  // "123.456.789-01" → "12345678901"
  function somenteDigitos(valor) {
    return String(valor === undefined || valor === null ? '' : valor).replace(/\D/g, '');
  }

  function estaVazio(valor) {
    return valor === undefined || valor === null || String(valor).trim() === '';
  }

  // Confere se o texto é uma data ISO de verdade ("2026-02-30" não é)
  function ehDataIsoValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return false;
    }
    var data = Encaixe.datas.paraData(texto);
    return Encaixe.datas.paraIsoData(data) === texto;
  }

  /* ---------- CPF ----------
     Algoritmo oficial dos dígitos verificadores:
     1. Multiplica os 9 primeiros números por 10, 9, 8 ... 2 e soma tudo.
     2. Pega o resto da divisão por 11. Se o resto for 0 ou 1, o dígito é 0;
        senão, o dígito é 11 menos o resto.
     3. Repete com os 10 primeiros números (já com o 1º dígito), pesos 11 a 2. */
  function calcularDigitoCpf(numeros, pesoInicial) {
    var soma = 0;
    for (var i = 0; i < numeros.length; i++) {
      soma = soma + Number(numeros[i]) * (pesoInicial - i);
    }
    var resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  // Recebe os 9 primeiros números e devolve o CPF completo, com 11.
  // Também é usada pelo dados-exemplo.js para gerar CPFs válidos.
  function completarCpf(noveNumeros) {
    var primeiroDigito = calcularDigitoCpf(noveNumeros, 10);
    var segundoDigito = calcularDigitoCpf(noveNumeros + primeiroDigito, 11);
    return noveNumeros + primeiroDigito + segundoDigito;
  }

  function cpfEhValido(cpf) {
    var numeros = somenteDigitos(cpf);
    if (numeros.length !== 11) {
      return false;
    }
    // CPFs com todos os números iguais (111.111.111-11) passam na conta, mas são inválidos
    var todosIguais = numeros.split('').every(function (numero) {
      return numero === numeros[0];
    });
    if (todosIguais) {
      return false;
    }
    return completarCpf(numeros.slice(0, 9)) === numeros;
  }

  /* ---------- Validadores de cada campo ---------- */

  function validarNome(nome) {
    var texto = String(nome || '').trim();
    if (texto === '') {
      return 'Digite o nome completo.';
    }
    if (texto.length < 3 || texto.length > 100) {
      return 'O nome precisa ter de 3 a 100 letras.';
    }
    // Letras de A a Z, letras com acento (À a ÿ, menos × e ÷) e espaços
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/.test(texto)) {
      return 'Use só letras e espaços no nome.';
    }
    return null;
  }

  function validarCpf(cpf) {
    if (estaVazio(cpf)) {
      return 'Digite o CPF.';
    }
    if (!cpfEhValido(cpf)) {
      return 'CPF inválido. Confira os 11 números.';
    }
    return null;
  }

  function validarCartaoSus(cartao) {
    var numeros = somenteDigitos(cartao);
    if (numeros === '') {
      return 'Digite o número do cartão SUS.';
    }
    if (numeros.length !== 15) {
      return 'Cartão SUS inválido. Confira os 15 números.';
    }
    if ('12789'.indexOf(numeros[0]) === -1) {
      return 'Cartão SUS inválido. Ele começa com 1, 2, 7, 8 ou 9.';
    }
    return null;
  }

  function validarTelefone(telefone) {
    var numeros = somenteDigitos(telefone);
    if (numeros === '') {
      return 'Digite o telefone com DDD.';
    }
    if (numeros.length !== 10 && numeros.length !== 11) {
      return 'Telefone inválido. Use o DDD e o número, como (11) 91234-5678.';
    }
    return null;
  }

  function validarDataNascimento(dataIso, hoje) {
    hoje = hoje || new Date();
    if (estaVazio(dataIso)) {
      return 'Digite a data de nascimento.';
    }
    if (!ehDataIsoValida(dataIso)) {
      return 'Data inválida. Confira o dia, o mês e o ano.';
    }
    if (Encaixe.datas.paraData(dataIso) > hoje) {
      return 'A data de nascimento não pode estar no futuro.';
    }
    if (Encaixe.datas.calcularIdade(dataIso, hoje) > 120) {
      return 'Confira o ano de nascimento. A idade passa de 120 anos.';
    }
    return null;
  }

  function validarDataEntradaFila(dataIso, hoje) {
    hoje = hoje || new Date();
    if (estaVazio(dataIso)) {
      return 'Digite a data de entrada na fila.';
    }
    if (!ehDataIsoValida(dataIso)) {
      return 'Data inválida. Confira o dia, o mês e o ano.';
    }
    if (Encaixe.datas.paraData(dataIso) > hoje) {
      return 'A data de entrada não pode estar no futuro.';
    }
    return null;
  }

  // Horário de consulta: no futuro, de 20 em 20 minutos, entre 7h00 e 16h40
  function validarHorarioConsulta(dataHoraIso, agora) {
    agora = agora || new Date();
    if (estaVazio(dataHoraIso)) {
      return 'Escolha o dia e o horário.';
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dataHoraIso) || !ehDataIsoValida(dataHoraIso.slice(0, 10))) {
      return 'Horário inválido. Confira o dia e a hora.';
    }
    var inicio = Encaixe.datas.paraData(dataHoraIso);
    if (inicio <= agora) {
      return 'Escolha um horário a partir de agora.';
    }
    var minutosDoDia = inicio.getHours() * 60 + inicio.getMinutes();
    if (minutosDoDia < PRIMEIRO_HORARIO_EM_MINUTOS || minutosDoDia > ULTIMO_HORARIO_EM_MINUTOS) {
      return 'Escolha um horário entre 7h00 e 16h40.';
    }
    if (inicio.getMinutes() % 20 !== 0) {
      return 'Os horários vão de 20 em 20 minutos, como 9h00, 9h20 e 9h40.';
    }
    return null;
  }

  /* ---------- Validação de um formulário inteiro ---------- */

  // Só guarda no objeto os campos que têm erro
  function anotarErro(erros, campo, mensagem) {
    if (mensagem) {
      erros[campo] = mensagem;
    }
  }

  function validarPaciente(dados, hoje) {
    var erros = {};
    anotarErro(erros, 'nome', validarNome(dados.nome));
    anotarErro(erros, 'cpf', validarCpf(dados.cpf));
    anotarErro(erros, 'cartaoSus', validarCartaoSus(dados.cartaoSus));
    anotarErro(erros, 'dataNascimento', validarDataNascimento(dados.dataNascimento, hoje));
    anotarErro(erros, 'telefone', validarTelefone(dados.telefone));
    if (estaVazio(dados.bairro)) {
      anotarErro(erros, 'bairro', 'Escolha o bairro.');
    }
    if (CONTATOS.indexOf(dados.contatoPreferido) === -1) {
      anotarErro(erros, 'contatoPreferido', 'Escolha como prefere receber os avisos.');
    }
    return erros;
  }

  function validarRegistroFila(dados, hoje) {
    var erros = {};
    if (!dados.pacienteId) { anotarErro(erros, 'pacienteId', 'Escolha o paciente.'); }
    if (!dados.especialidadeId) { anotarErro(erros, 'especialidadeId', 'Escolha a especialidade.'); }
    if (!dados.ubsId) { anotarErro(erros, 'ubsId', 'Escolha a UBS.'); }
    anotarErro(erros, 'dataEntrada', validarDataEntradaFila(dados.dataEntrada, hoje));
    if (RISCOS.indexOf(dados.classificacaoRisco) === -1) {
      anotarErro(erros, 'classificacaoRisco', 'Escolha a classificação de risco.');
    }
    return erros;
  }

  function validarConsulta(dados, agora) {
    var erros = {};
    if (!dados.pacienteId) { anotarErro(erros, 'pacienteId', 'Escolha o paciente.'); }
    if (!dados.ubsId) { anotarErro(erros, 'ubsId', 'Escolha a UBS.'); }
    if (!dados.profissionalId) { anotarErro(erros, 'profissionalId', 'Escolha o profissional.'); }
    anotarErro(erros, 'dataHora', validarHorarioConsulta(dados.dataHora, agora));
    return erros;
  }

  // Devolve o nome do primeiro campo com erro, ou null se não houver erro
  function primeiroCampoComErro(erros) {
    var campos = Object.keys(erros);
    return campos.length > 0 ? campos[0] : null;
  }

  return {
    BAIRROS: BAIRROS,
    somenteDigitos: somenteDigitos,
    ehDataIsoValida: ehDataIsoValida,
    completarCpf: completarCpf,
    cpfEhValido: cpfEhValido,
    validarNome: validarNome,
    validarCpf: validarCpf,
    validarCartaoSus: validarCartaoSus,
    validarTelefone: validarTelefone,
    validarDataNascimento: validarDataNascimento,
    validarDataEntradaFila: validarDataEntradaFila,
    validarHorarioConsulta: validarHorarioConsulta,
    validarPaciente: validarPaciente,
    validarRegistroFila: validarRegistroFila,
    validarConsulta: validarConsulta,
    primeiroCampoComErro: primeiroCampoComErro
  };
})();
