/* =====================================================================
   dados-exemplo.js: dados de demonstração

   Todos os nomes, CPFs, cartões e endereços são fictícios.

   As datas são RELATIVAS A HOJE: a função recebe "agora" e calcula tudo
   a partir dele. Assim a demonstração funciona em qualquer dia, inclusive
   no dia da gravação do pitch. (Por isso, antes de gravar, clique em
   "Restaurar dados de demonstração": as datas são recalculadas.)

   Este arquivo só DEFINE a função. Quem chama é o api.js, quando ainda
   não há nada salvo no localStorage ou quando a pessoa restaura os dados.
   Nessa hora todos os scripts já carregaram, então podemos usar
   Encaixe.datas (regras.js) e Encaixe.validacao (validacao.js).
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

Encaixe.gerarDadosExemplo = function (agora) {
  agora = agora || new Date();
  var datas = Encaixe.datas;
  var hoje = datas.inicioDoDia(agora);
  var amanha = datas.somarDias(hoje, 1);

  /* ---------- Sorteio com semente fixa ----------
     Para o histórico de 90 dias precisamos de "sorte" (qual profissional,
     qual horário, quem faltou). Mas a demonstração tem que ser sempre
     igual. Então usamos um gerador pseudoaleatório (Park-Miller): a partir
     da mesma semente, ele sempre produz a mesma sequência de números. */
  var estadoDoSorteio = 20262;
  function sortear() {
    estadoDoSorteio = (estadoDoSorteio * 16807) % 2147483647;
    return estadoDoSorteio / 2147483647;        // número entre 0 e 1
  }
  function sortearInteiro(limite) {
    return Math.floor(sortear() * limite);      // de 0 até limite - 1
  }

  /* ---------- Apoio para datas ---------- */
  function nascimentoComIdade(anos, diasDepoisDoAniversario) {
    var aniversario = datas.somarMeses(hoje, -anos * 12);
    return datas.paraIsoData(datas.somarDias(aniversario, -diasDepoisDoAniversario));
  }
  function entradaNaFila(meses, diasAMais) {
    return datas.paraIsoData(datas.somarDias(datas.somarMeses(hoje, -meses), -diasAMais));
  }
  // dia (Date) + "09:20" → "2026-11-10T09:20:00"
  function horario(dia, horaMinuto) {
    var partes = horaMinuto.split(':');
    var data = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Number(partes[0]), Number(partes[1]));
    return datas.paraIsoDataHora(data);
  }

  /* ---------- UBS, especialidades e profissionais ---------- */
  var ubs = [
    { id: 1, nome: 'UBS Jardim das Flores', bairro: 'Itaquera', endereco: 'Rua das Hortênsias, 120, Itaquera' },
    { id: 2, nome: 'UBS Vila Nova', bairro: 'Guaianases', endereco: 'Rua Ipê-Roxo, 45, Guaianases' },
    { id: 3, nome: 'UBS Parque do Carmo', bairro: 'São Mateus', endereco: 'Avenida dos Jacarandás, 800, São Mateus' }
  ];

  var especialidades = [
    { id: 1, nome: 'Ortopedia' },
    { id: 2, nome: 'Cardiologia' },
    { id: 3, nome: 'Oftalmologia' },
    { id: 4, nome: 'Dermatologia' },
    { id: 5, nome: 'Neurologia' },
    { id: 6, nome: 'Endocrinologia' }
  ];

  var profissionais = [
    { id: 1, nome: 'Dr. Paulo Menezes', registro: 'CRM-SP 100001', especialidadeId: 1 },
    { id: 2, nome: 'Dra. Helena Duarte', registro: 'CRM-SP 100002', especialidadeId: 1 },
    { id: 3, nome: 'Dr. Ricardo Tavares', registro: 'CRM-SP 100003', especialidadeId: 2 },
    { id: 4, nome: 'Dra. Camila Nogueira', registro: 'CRM-SP 100004', especialidadeId: 3 },
    { id: 5, nome: 'Dr. André Siqueira', registro: 'CRM-SP 100005', especialidadeId: 4 },
    { id: 6, nome: 'Dra. Beatriz Lemos', registro: 'CRM-SP 100006', especialidadeId: 5 },
    { id: 7, nome: 'Dr. Fernando Araújo', registro: 'CRM-SP 100007', especialidadeId: 6 },
    { id: 8, nome: 'Dra. Juliana Prado', registro: 'CRM-SP 100008', especialidadeId: 2 }
  ];

  // Relação N:N: quem atende em qual UBS e em qual dia (1 = segunda ... 5 = sexta).
  // Ortopedia: UBS Jardim das Flores todos os dias (Dr. Paulo) e as outras
  // duas UBS em dois dias cada (Dra. Helena, que atende nas duas).
  var profissionalUbs = [
    { profissionalId: 1, ubsId: 1, diaSemana: 1 },
    { profissionalId: 1, ubsId: 1, diaSemana: 2 },
    { profissionalId: 1, ubsId: 1, diaSemana: 3 },
    { profissionalId: 1, ubsId: 1, diaSemana: 4 },
    { profissionalId: 1, ubsId: 1, diaSemana: 5 },
    { profissionalId: 2, ubsId: 2, diaSemana: 1 },
    { profissionalId: 2, ubsId: 2, diaSemana: 3 },
    { profissionalId: 2, ubsId: 3, diaSemana: 2 },
    { profissionalId: 2, ubsId: 3, diaSemana: 4 },
    { profissionalId: 3, ubsId: 1, diaSemana: 2 },
    { profissionalId: 3, ubsId: 1, diaSemana: 4 },
    { profissionalId: 3, ubsId: 3, diaSemana: 1 },
    { profissionalId: 4, ubsId: 2, diaSemana: 1 },
    { profissionalId: 4, ubsId: 2, diaSemana: 3 },
    { profissionalId: 4, ubsId: 1, diaSemana: 5 },
    { profissionalId: 5, ubsId: 3, diaSemana: 2 },
    { profissionalId: 5, ubsId: 3, diaSemana: 4 },
    { profissionalId: 5, ubsId: 2, diaSemana: 5 },
    { profissionalId: 6, ubsId: 1, diaSemana: 3 },
    { profissionalId: 6, ubsId: 2, diaSemana: 4 },
    { profissionalId: 7, ubsId: 3, diaSemana: 3 },
    { profissionalId: 7, ubsId: 3, diaSemana: 5 },
    { profissionalId: 7, ubsId: 1, diaSemana: 1 },
    { profissionalId: 8, ubsId: 2, diaSemana: 2 },
    { profissionalId: 8, ubsId: 3, diaSemana: 4 }
  ];

  /* ---------- 24 pacientes ----------
     [nome, idade, bairro, contato preferido, aceita encaixe, gestante, PcD]
     Os 7 primeiros são o cenário do pitch (seção 13 do briefing). */
  var fichas = [
    ['Carlos Henrique Lima', 54, 'Itaquera', 'WHATSAPP', false, false, false],   // 1: a consulta da demo
    ['Maria Aparecida Souza', 68, 'Itaquera', 'WHATSAPP', true, false, false],   // 2: a estrela, 1º lugar
    ['João Batista Rocha', 41, 'Guaianases', 'TELEFONE', true, false, false],    // 3: 2º lugar
    ['Sebastiana Freitas', 72, 'Itaquera', 'TELEFONE', true, false, false],      // 4: risco médio
    ['Luana Martins', 29, 'Cidade Tiradentes', 'SMS', true, true, false],        // 5: gestante, risco baixo
    ['Antônio Carlos Dias', 63, 'Itaquera', 'TELEFONE', false, false, false],    // 6: não aceita encaixe
    ['Raimundo Nonato Silva', 65, 'José Bonifácio', 'TELEFONE', true, false, false], // 7: mostra o critério do bairro
    ['José Carlos Pereira', 58, 'Itaquera', 'WHATSAPP', true, false, false],
    ['Ana Paula Ribeiro', 37, 'Artur Alvim', 'WHATSAPP', false, false, false],
    ['Rosângela Alves', 49, 'Itaquera', 'SMS', true, false, false],
    ['Francisco Lopes', 61, 'Guaianases', 'TELEFONE', true, false, false],
    ['Benedita Ramos', 77, 'São Mateus', 'TELEFONE', true, false, false],
    ['Jorge Antunes', 45, 'São Mateus', 'WHATSAPP', true, false, false],
    ['Cláudia Nunes', 52, 'São Mateus', 'WHATSAPP', true, false, false],
    ['Marcos Vieira', 33, 'Cidade Tiradentes', 'SMS', true, false, true],
    ['Pedro Henrique Alves', 40, 'São Mateus', 'WHATSAPP', true, false, false],
    ['Terezinha Moura', 70, 'Itaquera', 'TELEFONE', true, false, false],
    ['Fernanda Castro', 34, 'Itaquera', 'WHATSAPP', true, true, false],
    ['Lucas Oliveira Santos', 26, 'Guaianases', 'SMS', true, false, false],
    ['Josefa Bezerra', 81, 'Guaianases', 'TELEFONE', false, false, true],
    ['Wellington Barbosa', 47, 'José Bonifácio', 'WHATSAPP', true, false, false],
    ['Patrícia Gomes', 39, 'São Mateus', 'SMS', true, false, false],
    ['Severino Cavalcanti', 74, 'São Mateus', 'TELEFONE', true, false, false],
    ['Aline Ferreira', 31, 'Artur Alvim', 'WHATSAPP', true, false, false]
  ];

  var pacientes = fichas.map(function (ficha, indice) {
    var id = indice + 1;
    // CPF: 9 números "inventados" + os 2 dígitos verificadores calculados
    var noveNumeros = String(123456000 + id * 104729).slice(0, 9);
    // Cartão SUS: o do Carlos é fixo (é o que aparece na nota de teste);
    // os outros começam com 7 e têm 15 números
    var cartaoSus = id === 1 ? '898001234567890' : '7' + String(10000000000000 + id * 37128459163);
    return {
      id: id,
      nome: ficha[0],
      cpf: Encaixe.validacao.completarCpf(noveNumeros),
      cartaoSus: cartaoSus,
      dataNascimento: nascimentoComIdade(ficha[1], 20 + (id * 37) % 300),
      telefone: '119' + String(60000000 + id * 1234567).slice(-8),
      bairro: ficha[2],
      contatoPreferido: ficha[3],
      aceitaEncaixe: ficha[4],
      gestante: ficha[5],
      pcd: ficha[6]
    };
  });

  /* ---------- Fila de espera: 20 pessoas aguardando ----------
     [pacienteId, especialidadeId, ubsId, meses na fila, dias a mais, risco] */
  var esperando = [
    // Ortopedia na UBS Jardim das Flores: a fila do pitch
    [2, 1, 1, 14, 5, 'ALTA'],     // Maria: risco alto + 68 anos + mora em Itaquera → 1º
    [3, 1, 1, 6, 12, 'ALTA'],     // João: risco alto, sem prioridade legal → 2º
    [4, 1, 1, 20, 3, 'MEDIA'],    // Sebastiana: espera mais, mas o risco vem primeiro → 3º
    [7, 1, 1, 9, 8, 'MEDIA'],     // Raimundo: mesmo risco e prioridade da Sebastiana, mas mora longe → 4º
    [5, 1, 1, 3, 10, 'BAIXA'],    // Luana: gestante, risco baixo → último
    [6, 1, 1, 10, 2, 'ALTA'],     // Antônio: não aceita encaixe → não aparece
    // Outras filas
    [17, 2, 1, 8, 4, 'ALTA'],
    [23, 2, 3, 11, 9, 'MEDIA'],
    [20, 3, 2, 16, 1, 'MEDIA'],
    [21, 3, 1, 5, 15, 'BAIXA'],
    [22, 4, 3, 7, 6, 'BAIXA'],
    [19, 4, 2, 4, 20, 'MEDIA'],
    [18, 5, 1, 12, 11, 'ALTA'],
    [24, 5, 2, 9, 3, 'MEDIA'],
    [16, 6, 3, 13, 7, 'MEDIA'],
    [12, 6, 1, 6, 14, 'BAIXA'],
    [13, 1, 2, 10, 5, 'ALTA'],
    [14, 1, 3, 15, 2, 'MEDIA'],
    [15, 2, 2, 2, 18, 'BAIXA'],
    [10, 3, 3, 18, 9, 'ALTA']
  ];

  var fila = esperando.map(function (linha) {
    return {
      pacienteId: linha[0],
      especialidadeId: linha[1],
      ubsId: linha[2],
      dataEntrada: entradaNaFila(linha[3], linha[4]),
      classificacaoRisco: linha[5],
      status: 'AGUARDANDO',
      dataSaida: null
    };
  });

  // Quem está aguardando uma especialidade não pode ter consulta dela
  // (seria contraditório: está esperando justamente essa consulta)
  function estaAguardando(pacienteId, especialidadeId) {
    return fila.some(function (registro) {
      return registro.pacienteId === pacienteId &&
        registro.especialidadeId === especialidadeId &&
        registro.status === 'AGUARDANDO';
    });
  }

  /* ---------- Consultas ---------- */
  var consultas = [];
  var horariosOcupados = {};   // evita duas consultas do mesmo profissional ou paciente no mesmo horário

  function horarioLivre(profissionalId, pacienteId, dataHora) {
    return !horariosOcupados['profissional-' + profissionalId + '-' + dataHora] &&
      !horariosOcupados['paciente-' + pacienteId + '-' + dataHora];
  }

  function adicionarConsulta(consulta) {
    var profissional = profissionais[consulta.profissionalId - 1];
    consulta.especialidadeId = profissional.especialidadeId;
    consulta.origem = consulta.origem || 'NORMAL';
    consulta.motivoFalta = consulta.motivoFalta || null;
    consultas.push(consulta);
    // Consultas canceladas não ocupam o horário: a vaga fica livre
    if (consulta.status !== 'CANCELADA') {
      horariosOcupados['profissional-' + consulta.profissionalId + '-' + consulta.dataHora] = true;
      horariosOcupados['paciente-' + consulta.pacienteId + '-' + consulta.dataHora] = true;
    }
  }

  /* Motivos de falta. Em vez de sortear (com poucas faltas, o sorteio
     sai torto), cada UBS vai tirando os motivos desta sequência, em ordem.
     Sequência geral, com 20 motivos: 7 esquecimento (35%), 6 transporte
     (30%), 4 trabalho (20%), 2 saúde (10%) e 1 outro (5%).
     Na UBS Parque do Carmo, o transporte é metade das faltas, para os
     relatórios terem uma conclusão interessante. */
  var MOTIVOS_EM_GERAL = [
    'ESQUECIMENTO', 'TRANSPORTE', 'ESQUECIMENTO', 'TRABALHO', 'TRANSPORTE',
    'ESQUECIMENTO', 'SAUDE', 'TRANSPORTE', 'ESQUECIMENTO', 'TRABALHO',
    'ESQUECIMENTO', 'TRANSPORTE', 'OUTRO', 'ESQUECIMENTO', 'TRABALHO',
    'TRANSPORTE', 'ESQUECIMENTO', 'SAUDE', 'TRANSPORTE', 'TRABALHO'
  ];
  var MOTIVOS_NO_PARQUE_DO_CARMO = [
    'TRANSPORTE', 'ESQUECIMENTO', 'TRANSPORTE', 'TRABALHO', 'TRANSPORTE',
    'SAUDE', 'TRANSPORTE', 'ESQUECIMENTO', 'TRANSPORTE', 'TRABALHO'
  ];
  var faltasPorUbs = { 1: 0, 2: 0, 3: 0 };   // quantas faltas cada UBS já recebeu

  function proximoMotivoDeFalta(ubsId) {
    var sequencia = ubsId === 3 ? MOTIVOS_NO_PARQUE_DO_CARMO : MOTIVOS_EM_GERAL;
    var motivo = sequencia[faltasPorUbs[ubsId] % sequencia.length];
    faltasPorUbs[ubsId] = faltasPorUbs[ubsId] + 1;
    return motivo;
  }

  // --- Últimos 90 dias: cerca de 120 consultas ---
  var canceladasDoHistorico = [];
  var criadas = 0;
  while (criadas < 120) {
    var atendimento = profissionalUbs[sortearInteiro(profissionalUbs.length)];
    var dia = datas.somarDias(hoje, -(1 + sortearInteiro(89)));
    // anda para trás até cair no dia da semana em que o profissional atende ali
    while (dia.getDay() !== atendimento.diaSemana) {
      dia = datas.somarDias(dia, -1);
    }
    if (datas.diasEntre(datas.paraIsoData(dia), hoje) > 90) {
      dia = datas.somarDias(dia, 7);
    }
    var minutos = 7 * 60 + sortearInteiro(30) * 20;      // de 7h00 a 16h40, de 20 em 20 minutos
    var dataHora = horario(dia, Math.floor(minutos / 60) + ':' + (minutos % 60));
    var paciente = pacientes[sortearInteiro(pacientes.length)];
    var especialidadeId = profissionais[atendimento.profissionalId - 1].especialidadeId;

    if (!horarioLivre(atendimento.profissionalId, paciente.id, dataHora) || estaAguardando(paciente.id, especialidadeId)) {
      continue;   // horário ocupado ou paciente ainda esperando essa especialidade: sorteia de novo
    }

    var sorte = sortear();
    var consulta = {
      pacienteId: paciente.id,
      profissionalId: atendimento.profissionalId,
      ubsId: atendimento.ubsId,
      dataHora: dataHora
    };
    if (sorte < 0.22) {
      consulta.status = 'FALTA';
      consulta.motivoFalta = proximoMotivoDeFalta(atendimento.ubsId);
    } else if (sorte < 0.38) {
      consulta.status = 'CANCELADA';
      canceladasDoHistorico.push(consulta);
    } else {
      consulta.status = 'REALIZADA';
    }
    adicionarConsulta(consulta);
    criadas = criadas + 1;
  }

  // --- Encaixes do histórico: 10 das vagas canceladas foram reaproveitadas ---
  var registrosEncaixados = [];
  canceladasDoHistorico.slice(0, 10).forEach(function (vaga, indice) {
    var possiveis = pacientes.filter(function (p) {
      return p.aceitaEncaixe &&
        !estaAguardando(p.id, vaga.especialidadeId) &&
        horarioLivre(vaga.profissionalId, p.id, vaga.dataHora);
    });
    var escolhido = possiveis[sortearInteiro(possiveis.length)];
    adicionarConsulta({
      pacienteId: escolhido.id,
      profissionalId: vaga.profissionalId,
      ubsId: vaga.ubsId,
      dataHora: vaga.dataHora,
      status: 'REALIZADA',
      origem: 'ENCAIXE'
    });
    // O registro de fila dessa pessoa: entrou meses antes e saiu na véspera da consulta
    var diaDaConsulta = datas.paraData(vaga.dataHora);
    registrosEncaixados.push({
      pacienteId: escolhido.id,
      especialidadeId: vaga.especialidadeId,
      ubsId: vaga.ubsId,
      dataEntrada: datas.paraIsoData(datas.somarMeses(diaDaConsulta, -(3 + (indice * 5) % 14))),
      classificacaoRisco: ['ALTA', 'MEDIA', 'BAIXA'][indice % 3],
      status: 'ENCAIXADO',
      dataSaida: datas.paraIsoData(datas.somarDias(diaDaConsulta, -1))
    });
  });

  /* --- Hoje e amanhã: agenda de Ortopedia na UBS Jardim das Flores (Dr. Paulo) ---
     As consultas de hoje que já passaram aparecem como atendidas
     (e uma falta); as que ainda vão acontecer, confirmadas ou agendadas. */
  var agendaDeHoje = [
    ['07:00', 12, 'CONFIRMADA'],
    ['07:20', 15, 'CONFIRMADA'],
    ['08:00', 17, 'AGENDADA'],
    ['08:20', 18, 'CONFIRMADA'],
    ['08:40', 20, 'AGENDADA'],
    ['09:20', 21, 'CONFIRMADA'],
    ['10:00', 22, 'CONFIRMADA']
  ];
  agendaDeHoje.forEach(function (linha) {
    var dataHora = horario(hoje, linha[0]);
    var consulta = { pacienteId: linha[1], profissionalId: 1, ubsId: 1, dataHora: dataHora, status: linha[2] };
    if (datas.paraData(dataHora) <= agora) {
      consulta.status = 'REALIZADA';
      if (linha[1] === 15) {           // Marcos faltou hoje cedo
        consulta.status = 'FALTA';
        consulta.motivoFalta = 'TRANSPORTE';
      }
    }
    adicionarConsulta(consulta);
  });

  // Amanhã: a agenda do pitch. Os nomes das 8h40 às 10h00 são os mesmos
  // da demonstração do Início.
  var agendaDeAmanha = [
    ['07:00', 19, 'CONFIRMADA'],
    ['07:20', 23, 'AGENDADA'],
    ['07:40', 24, 'CONFIRMADA'],
    ['08:00', 16, 'CONFIRMADA'],
    ['08:40', 8, 'CONFIRMADA'],    // José Carlos Pereira
    ['09:00', 9, 'CONFIRMADA'],    // Ana Paula Ribeiro
    ['09:20', 1, 'AGENDADA'],      // Carlos Henrique Lima: a consulta da demo
    ['09:40', 10, 'AGENDADA'],     // Rosângela Alves
    ['10:00', 11, 'AGENDADA']      // Francisco Lopes
  ];
  // (Ninguém aparece nas duas agendas, hoje e amanhã, e quem espera na fila
  // de Ortopedia não tem consulta de Ortopedia marcada.)
  agendaDeAmanha.forEach(function (linha) {
    adicionarConsulta({
      pacienteId: linha[1],
      profissionalId: 1,
      ubsId: 1,
      dataHora: horario(amanha, linha[0]),
      status: linha[2]
    });
  });

  /* ---------- Ids ----------
     As consultas ganham id na ordem do horário, e a fila na ordem em que
     foi montada (primeiro quem está aguardando). */
  consultas.sort(function (a, b) {
    return a.dataHora < b.dataHora ? -1 : (a.dataHora > b.dataHora ? 1 : a.profissionalId - b.profissionalId);
  });
  consultas.forEach(function (consulta, indice) {
    consulta.id = indice + 1;
  });

  fila = fila.concat(registrosEncaixados);
  fila.forEach(function (registro, indice) {
    registro.id = indice + 1;
  });

  return {
    versao: 1,
    geradoEm: datas.paraIsoDataHora(agora),
    ubs: ubs,
    especialidades: especialidades,
    profissionais: profissionais,
    profissionalUbs: profissionalUbs,
    pacientes: pacientes,
    consultas: consultas,
    fila: fila,
    proximoId: {
      pacientes: pacientes.length + 1,
      consultas: consultas.length + 1,
      fila: fila.length + 1
    }
  };
};
