/* =====================================================================
   regras.js: regras de negócio do Encaixe

   No sistema final, estas regras moram na camada service do Java.
   Esta cópia em JS existe para o "modo local" funcionar, e segue
   EXATAMENTE a mesma lógica. Por isso cada regra é uma função pequena
   e pura: recebe os dados, devolve uma resposta e não mexe em nada
   (não lê localStorage, não altera a página). Quem grava é o api.js.

   Conteúdo:
     Encaixe.datas   funções de apoio para datas, idade e tempo na fila
     Encaixe.regras  as regras 1 a 6 da seção 6 do briefing
   ===================================================================== */
window.Encaixe = window.Encaixe || {};


/* ---------------------------------------------------------------------
   Datas
   O sistema guarda datas como texto ISO, na hora local:
     "2026-11-10"           (só a data)
     "2026-11-10T09:20:00"  (data e hora)
   --------------------------------------------------------------------- */
Encaixe.datas = (function () {

  var UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

  function doisDigitos(numero) {
    return String(numero).padStart(2, '0');
  }

  // Converte o texto ISO em Date, na hora local.
  // Não usamos new Date("2026-11-10") direto porque, quando o texto tem
  // só a data, o JavaScript entende meia-noite em UTC. No Brasil, isso
  // vira 21h do dia ANTERIOR, e a data mostrada ficaria errada.
  function paraData(textoIso) {
    var partes = textoIso.split('T');
    var data = partes[0].split('-');
    var hora = (partes[1] || '00:00:00').split(':');
    return new Date(
      Number(data[0]), Number(data[1]) - 1, Number(data[2]),
      Number(hora[0]), Number(hora[1]), Number(hora[2] || 0)
    );
  }

  // Date → "2026-11-10"
  function paraIsoData(data) {
    return data.getFullYear() + '-' + doisDigitos(data.getMonth() + 1) + '-' + doisDigitos(data.getDate());
  }

  // Date → "2026-11-10T09:20:00"
  function paraIsoDataHora(data) {
    return paraIsoData(data) + 'T' + doisDigitos(data.getHours()) + ':' + doisDigitos(data.getMinutes()) + ':00';
  }

  // A mesma data, à meia-noite
  function inicioDoDia(data) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  function somarDias(data, dias) {
    var resultado = new Date(data.getTime());
    resultado.setDate(resultado.getDate() + dias);
    return resultado;
  }

  // Soma meses sem "pular" de mês: 31 de março menos 1 mês dá 28 (ou 29)
  // de fevereiro, e não 3 de março, que é o que o JavaScript faria sozinho.
  function somarMeses(data, meses) {
    var resultado = new Date(data.getFullYear(), data.getMonth() + meses, 1, data.getHours(), data.getMinutes());
    var ultimoDiaDoMes = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate();
    resultado.setDate(Math.min(data.getDate(), ultimoDiaDoMes));
    return resultado;
  }

  function mesmoDia(dataA, dataB) {
    return paraIsoData(dataA) === paraIsoData(dataB);
  }

  // Idade em anos completos, na data "hoje"
  function calcularIdade(dataNascimentoIso, hoje) {
    var nascimento = paraData(dataNascimentoIso);
    var idade = hoje.getFullYear() - nascimento.getFullYear();
    var aindaNaoFezAniversario =
      hoje.getMonth() < nascimento.getMonth() ||
      (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
    if (aindaNaoFezAniversario) {
      idade = idade - 1;
    }
    return idade;
  }

  // Tempo entre uma data ISO e "fim", em meses completos mais os dias que sobram.
  // Ex.: entrou na fila em 01/09/2025 e hoje é 06/11/2026 → { meses: 14, dias: 5 }
  function tempoEntre(inicioIso, fim) {
    var inicio = inicioDoDia(paraData(inicioIso));
    var final = inicioDoDia(fim);
    var meses = (final.getFullYear() - inicio.getFullYear()) * 12 + (final.getMonth() - inicio.getMonth());
    if (somarMeses(inicio, meses) > final) {
      meses = meses - 1;           // ainda não completou o último mês
    }
    if (meses < 0) {
      meses = 0;
    }
    var depoisDosMeses = somarMeses(inicio, meses);
    var dias = Math.round((final - depoisDosMeses) / UM_DIA_EM_MS);
    return { meses: meses, dias: Math.max(dias, 0) };
  }

  // Diferença em dias inteiros entre duas datas (sem contar as horas)
  function diasEntre(inicioIso, fim) {
    var inicio = inicioDoDia(paraData(inicioIso));
    return Math.round((inicioDoDia(fim) - inicio) / UM_DIA_EM_MS);
  }

  return {
    paraData: paraData,
    paraIsoData: paraIsoData,
    paraIsoDataHora: paraIsoDataHora,
    inicioDoDia: inicioDoDia,
    somarDias: somarDias,
    somarMeses: somarMeses,
    mesmoDia: mesmoDia,
    calcularIdade: calcularIdade,
    tempoEntre: tempoEntre,
    diasEntre: diasEntre
  };
})();


/* ---------------------------------------------------------------------
   Regras de negócio
   --------------------------------------------------------------------- */
Encaixe.regras = (function () {

  var datas = Encaixe.datas;

  // Consultas "ativas" ocupam o horário: alguém vai ser atendido ali
  var STATUS_ATIVOS = ['AGENDADA', 'CONFIRMADA'];

  // Ordem do risco: quanto menor o número, mais na frente
  var ORDEM_DO_RISCO = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
  var ROTULO_DO_RISCO = { ALTA: 'Risco alto', MEDIA: 'Risco médio', BAIXA: 'Risco baixo' };

  // Para mensagens como "não atende na UBS Vila Nova às sextas"
  // (índice igual ao getDay() do JavaScript: 0 = domingo)
  var DIA_DA_SEMANA_NO_PLURAL = [
    'aos domingos', 'às segundas', 'às terças', 'às quartas',
    'às quintas', 'às sextas', 'aos sábados'
  ];

  function estaAtiva(consulta) {
    return STATUS_ATIVOS.indexOf(consulta.status) !== -1;
  }

  // A consulta já começou (ou já passou)?
  function jaPassou(consulta, agora) {
    return datas.paraData(consulta.dataHora) <= agora;
  }

  function buscarPorId(lista, id) {
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) {
        return lista[i];
      }
    }
    return null;
  }

  /* ===== Regra 1: prioridade legal =====
     Tem prioridade quem tem 60 anos ou mais, é gestante ou é PcD.
     "hoje" é opcional: serve para os testes usarem uma data fixa. */
  function temPrioridadeLegal(paciente, hoje) {
    hoje = hoje || new Date();
    var idade = datas.calcularIdade(paciente.dataNascimento, hoje);
    return idade >= 60 || paciente.gestante === true || paciente.pcd === true;
  }

  /* ===== Regra 2: consulta não confirmada =====
     "Não confirmada" não é gravado no banco: é calculado na hora.
     Toda consulta precisa ser confirmada até a véspera. Então, uma
     consulta AGENDADA (ainda não confirmada) que ainda não passou e que
     é HOJE ou AMANHÃ já está atrasada na confirmação.

     Contamos pelo dia do calendário, e não por "24 horas", de propósito:
     com 24 horas, a consulta de amanhã às 9h20 só ficaria "não confirmada"
     depois das 9h20 de hoje, e a recepção não saberia de manhã para quem
     ligar. (O Java segue esta mesma regra.) */
  function estaNaoConfirmada(consulta, agora) {
    agora = agora || new Date();
    if (consulta.status !== 'AGENDADA' || jaPassou(consulta, agora)) {
      return false;
    }
    var diaDaConsulta = datas.inicioDoDia(datas.paraData(consulta.dataHora));
    var amanha = datas.somarDias(datas.inicioDoDia(agora), 1);
    return diaDaConsulta <= amanha;
  }

  // O paciente já tem outra consulta ativa exatamente neste horário?
  function temConsultaAtivaNoHorario(pacienteId, dataHora, consultas) {
    return consultas.some(function (consulta) {
      return consulta.pacienteId === pacienteId &&
        consulta.dataHora === dataHora &&
        estaAtiva(consulta);
    });
  }

  /* Uma vaga está livre quando a consulta foi CANCELADA, ainda não passou e
     ninguém foi encaixado no mesmo horário com o mesmo profissional.
     (A consulta cancelada fica guardada para o histórico, por isso
     precisamos olhar se já existe outra consulta ocupando o horário.) */
  function vagaEstaLivre(vaga, consultas, agora) {
    agora = agora || new Date();
    if (vaga.status !== 'CANCELADA' || jaPassou(vaga, agora)) {
      return false;
    }
    var horarioOcupado = consultas.some(function (consulta) {
      return consulta.id !== vaga.id &&
        consulta.profissionalId === vaga.profissionalId &&
        consulta.dataHora === vaga.dataHora &&
        estaAtiva(consulta);
    });
    return !horarioOcupado;
  }

  // { meses: 14, dias: 5 } → "14 meses na fila"
  function textoTempoNaFila(tempo) {
    if (tempo.meses === 1) {
      return '1 mês na fila';
    }
    if (tempo.meses > 1) {
      return tempo.meses + ' meses na fila';
    }
    if (tempo.dias === 1) {
      return '1 dia na fila';
    }
    return tempo.dias + ' dias na fila';
  }

  /* Compara dois candidatos, critério por critério. Devolve um número
     negativo se "a" vem antes, positivo se "b" vem antes. Só passa para
     o próximo critério quando há empate no anterior. */
  function compararCandidatos(a, b) {
    // 1. Classificação de risco: ALTA, depois MEDIA, depois BAIXA
    var diferencaDeRisco = ORDEM_DO_RISCO[a.registroFila.classificacaoRisco] - ORDEM_DO_RISCO[b.registroFila.classificacaoRisco];
    if (diferencaDeRisco !== 0) {
      return diferencaDeRisco;
    }
    // 2. Prioridade legal: quem tem vem antes
    if (a.temPrioridadeLegal !== b.temPrioridadeLegal) {
      return a.temPrioridadeLegal ? -1 : 1;
    }
    // 3. Mora no bairro da UBS: quem mora vem antes
    if (a.moraNoBairro !== b.moraNoBairro) {
      return a.moraNoBairro ? -1 : 1;
    }
    // 4. Data de entrada na fila: quem entrou primeiro vem antes.
    //    Datas ISO ("2025-09-01") podem ser comparadas como texto.
    if (a.registroFila.dataEntrada !== b.registroFila.dataEntrada) {
      return a.registroFila.dataEntrada < b.registroFila.dataEntrada ? -1 : 1;
    }
    // Empate total: quem foi cadastrado antes na fila
    return a.registroFila.id - b.registroFila.id;
  }

  /* ===== Regra 3: candidatos para o encaixe =====
     vaga: a consulta CANCELADA que liberou o horário
     fila, pacientes, consultas: as listas completas do banco
     listaUbs: precisamos do bairro da UBS para o critério 3
     agora: opcional, para os testes

     Devolve os candidatos já na ordem, cada um com os "motivos" da
     posição, que a tela mostra como etiquetas. */
  function listarCandidatosEncaixe(vaga, fila, pacientes, consultas, listaUbs, agora) {
    agora = agora || new Date();
    if (vaga.status !== 'CANCELADA' || jaPassou(vaga, agora)) {
      return [];
    }
    var ubsDaVaga = buscarPorId(listaUbs, vaga.ubsId);
    var candidatos = [];

    fila.forEach(function (registroFila) {
      // Quem entra: aguardando, mesma especialidade e mesma UBS da vaga...
      if (registroFila.status !== 'AGUARDANDO') { return; }
      if (registroFila.especialidadeId !== vaga.especialidadeId) { return; }
      if (registroFila.ubsId !== vaga.ubsId) { return; }

      // ...que aceita ser chamado em cima da hora...
      var paciente = buscarPorId(pacientes, registroFila.pacienteId);
      if (!paciente || paciente.aceitaEncaixe !== true) { return; }

      // ...e que não tem outra consulta marcada no mesmo horário
      if (temConsultaAtivaNoHorario(paciente.id, vaga.dataHora, consultas)) { return; }

      var idade = datas.calcularIdade(paciente.dataNascimento, agora);
      var tempoNaFila = datas.tempoEntre(registroFila.dataEntrada, agora);
      var prioridade = temPrioridadeLegal(paciente, agora);
      var moraNoBairro = ubsDaVaga !== null && paciente.bairro === ubsDaVaga.bairro;

      // Os motivos seguem a mesma ordem dos critérios
      var motivos = [ROTULO_DO_RISCO[registroFila.classificacaoRisco]];
      if (idade >= 60) { motivos.push(idade + ' anos'); }
      if (paciente.gestante) { motivos.push('Gestante'); }
      if (paciente.pcd) { motivos.push('PcD'); }
      motivos.push(textoTempoNaFila(tempoNaFila));
      if (moraNoBairro) { motivos.push('Mora no bairro da UBS'); }

      candidatos.push({
        registroFila: registroFila,
        paciente: paciente,
        idade: idade,
        tempoNaFila: tempoNaFila,
        temPrioridadeLegal: prioridade,
        moraNoBairro: moraNoBairro,
        motivos: motivos
      });
    });

    candidatos.sort(compararCandidatos);
    return candidatos;
  }

  /* ===== Regra 4: encaixar =====
     Cria a consulta nova do paciente da fila, no mesmo horário,
     profissional e UBS da vaga, já CONFIRMADA (ele aceitou pelo telefone).
     O registro da fila vira ENCAIXADO, com dataSaida = hoje.
     A consulta cancelada não muda: fica para o histórico.

     Esta função só MONTA os objetos novos. Quem gera o id e grava é o
     api.js, em encaixe.confirmar(vagaId, filaId). */
  function encaixar(vaga, registroFila, hoje) {
    hoje = hoje || new Date();
    var novaConsulta = {
      pacienteId: registroFila.pacienteId,
      profissionalId: vaga.profissionalId,
      ubsId: vaga.ubsId,
      especialidadeId: vaga.especialidadeId,
      dataHora: vaga.dataHora,
      status: 'CONFIRMADA',
      origem: 'ENCAIXE',
      motivoFalta: null
    };
    var filaAtualizada = Object.assign({}, registroFila, {
      status: 'ENCAIXADO',
      dataSaida: datas.paraIsoData(hoje)
    });
    return { consulta: novaConsulta, registroFila: filaAtualizada };
  }

  /* ===== Regra 5: validações de agendamento =====
     dados: { id (só na edição), pacienteId, profissionalId, ubsId, dataHora }
     contexto: { consultas, profissionais, profissionalUbs, ubs, agora }
     Devolve a mensagem de erro, ou null se estiver tudo certo.
     (O formato do horário, de 20 em 20 minutos, é conferido antes, em
     Encaixe.validacao.validarHorarioConsulta.) */
  function validarAgendamento(dados, contexto) {
    var agora = contexto.agora || new Date();
    var inicio = datas.paraData(dados.dataHora);

    // Não agendar no passado
    if (inicio <= agora) {
      return 'Escolha um horário a partir de agora.';
    }

    // O profissional precisa atender nesta UBS neste dia da semana
    var profissional = buscarPorId(contexto.profissionais, dados.profissionalId);
    var ubs = buscarPorId(contexto.ubs, dados.ubsId);
    var diaDaSemana = inicio.getDay();   // 0 = domingo, 1 = segunda ... 6 = sábado
    var atendeNesteDia = contexto.profissionalUbs.some(function (atendimento) {
      return atendimento.profissionalId === dados.profissionalId &&
        atendimento.ubsId === dados.ubsId &&
        atendimento.diaSemana === diaDaSemana;
    });
    if (!atendeNesteDia) {
      return profissional.nome + ' não atende na ' + ubs.nome + ' ' + DIA_DA_SEMANA_NO_PLURAL[diaDaSemana] + '.';
    }

    // Nem o profissional nem o paciente podem ter duas consultas ativas no mesmo horário.
    // Na edição, a própria consulta não conta (por isso o "consulta.id !== dados.id").
    var outrasNoHorario = contexto.consultas.filter(function (consulta) {
      return consulta.id !== dados.id && consulta.dataHora === dados.dataHora && estaAtiva(consulta);
    });
    var profissionalOcupado = outrasNoHorario.some(function (consulta) {
      return consulta.profissionalId === dados.profissionalId;
    });
    if (profissionalOcupado) {
      return profissional.nome + ' já tem uma consulta neste horário.';
    }
    var pacienteOcupado = outrasNoHorario.some(function (consulta) {
      return consulta.pacienteId === dados.pacienteId;
    });
    if (pacienteOcupado) {
      return 'Este paciente já tem uma consulta neste horário.';
    }

    return null;
  }

  /* ===== Regra 6: excluir paciente =====
     Bloqueia se o paciente tem consultas futuras ativas ou está aguardando
     na fila. Imita a chave estrangeira do banco, que não deixaria apagar.
     Devolve a mensagem de erro, ou null se pode excluir. */
  function verificarExclusaoPaciente(pacienteId, consultas, fila, agora) {
    agora = agora || new Date();
    var consultasFuturas = consultas.filter(function (consulta) {
      return consulta.pacienteId === pacienteId && estaAtiva(consulta) && !jaPassou(consulta, agora);
    });
    if (consultasFuturas.length === 1) {
      return 'Este paciente tem 1 consulta futura. Cancele a consulta antes de excluir.';
    }
    if (consultasFuturas.length > 1) {
      return 'Este paciente tem ' + consultasFuturas.length + ' consultas futuras. Cancele as consultas antes de excluir.';
    }
    var estaNaFila = fila.some(function (registro) {
      return registro.pacienteId === pacienteId && registro.status === 'AGUARDANDO';
    });
    if (estaNaFila) {
      return 'Este paciente está aguardando na fila de espera. Remova da fila antes de excluir.';
    }
    return null;
  }

  /* Um paciente não pode estar duas vezes na fila da mesma especialidade
     aguardando. "idIgnorado" é o próprio registro, na edição. */
  function verificarDuplicidadeNaFila(dados, fila, especialidades, idIgnorado) {
    var duplicado = fila.some(function (registro) {
      return registro.id !== idIgnorado &&
        registro.pacienteId === dados.pacienteId &&
        registro.especialidadeId === dados.especialidadeId &&
        registro.status === 'AGUARDANDO';
    });
    if (duplicado) {
      var especialidade = buscarPorId(especialidades, dados.especialidadeId);
      return 'Este paciente já está na fila de ' + especialidade.nome + '.';
    }
    return null;
  }

  return {
    DIA_DA_SEMANA_NO_PLURAL: DIA_DA_SEMANA_NO_PLURAL,
    estaAtiva: estaAtiva,
    jaPassou: jaPassou,
    temPrioridadeLegal: temPrioridadeLegal,
    estaNaoConfirmada: estaNaoConfirmada,
    temConsultaAtivaNoHorario: temConsultaAtivaNoHorario,
    vagaEstaLivre: vagaEstaLivre,
    textoTempoNaFila: textoTempoNaFila,
    compararCandidatos: compararCandidatos,
    listarCandidatosEncaixe: listarCandidatosEncaixe,
    encaixar: encaixar,
    validarAgendamento: validarAgendamento,
    verificarExclusaoPaciente: verificarExclusaoPaciente,
    verificarDuplicidadeNaFila: verificarDuplicidadeNaFila
  };
})();
