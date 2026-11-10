/* =====================================================================
   api.js: camada de dados

   As páginas NUNCA acessam o localStorage direto: elas só chamam
   Encaixe.api. Assim, ligar no backend Java depois exige mudar só a
   linha "modo" abaixo, sem tocar em nenhuma página.

   Há duas implementações com exatamente as mesmas funções:
     modoLocal     lê e grava no localStorage do navegador
     modoServidor  chama o Java por fetch, seguindo o contrato REST

   Toda função devolve uma Promise, mesmo no modo local. É por isso que
   a troca de modo não muda nada nas páginas: elas sempre usam .then()
   (ou await), e não sabem se a resposta veio do navegador ou do Java.

   Em caso de erro, a Promise é rejeitada com um Error cuja mensagem já
   está pronta para mostrar na tela. Quando o erro é de um campo, o Error
   também traz a propriedade "campo" (ex.: "cpf"), para a página marcar
   o campo certo.
   ===================================================================== */
window.Encaixe = window.Encaixe || {};

Encaixe.config = {
  modo: 'local',                          // 'local' (localStorage) ou 'servidor' (Java)
  urlServidor: 'http://localhost:8080/api'
};


/* =====================================================================
   Modo local
   ===================================================================== */
Encaixe.modoLocal = (function () {

  var CHAVE = 'encaixe-db-v1';
  var bancoEmMemoria = null;   // usado só se o navegador bloquear o localStorage

  var datas = Encaixe.datas;
  var regras = Encaixe.regras;
  var validacao = Encaixe.validacao;

  var MOTIVOS_DE_FALTA = ['ESQUECIMENTO', 'TRANSPORTE', 'TRABALHO', 'SAUDE', 'OUTRO'];

  /* ---------- Ler e gravar o "banco" ---------- */

  function lerBanco() {
    var texto;
    try {
      texto = window.localStorage.getItem(CHAVE);
    } catch (erro) {
      texto = bancoEmMemoria;    // alguns navegadores bloqueiam o localStorage em file://
    }
    if (texto) {
      try {
        return JSON.parse(texto);
      } catch (erro) {
        // texto corrompido: cai para os dados de exemplo abaixo
      }
    }
    var novo = Encaixe.gerarDadosExemplo(new Date());
    salvarBanco(novo);
    return novo;
  }

  function salvarBanco(banco) {
    var texto = JSON.stringify(banco);
    try {
      window.localStorage.setItem(CHAVE, texto);
    } catch (erro) {
      bancoEmMemoria = texto;
    }
  }

  /* ---------- Apoio ---------- */

  // Roda a função e devolve o resultado dentro de uma Promise.
  // Se a função lançar um erro (throw), a Promise é rejeitada com ele.
  // A cópia (JSON) garante que a página não altere o banco sem querer.
  function executar(funcao) {
    return new Promise(function (resolver) {
      var resultado = funcao();
      resolver(resultado === undefined ? undefined : JSON.parse(JSON.stringify(resultado)));
    });
  }

  function falhar(mensagem, campo) {
    var erro = new Error(mensagem);
    if (campo) {
      erro.campo = campo;
    }
    throw erro;
  }

  // Se o objeto de erros da validação tiver algum campo, falha com o primeiro
  function falharSeTiverErros(erros) {
    var campo = validacao.primeiroCampoComErro(erros);
    if (campo) {
      falhar(erros[campo], campo);
    }
  }

  function buscarNaLista(lista, id) {
    var numero = Number(id);
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === numero) {
        return lista[i];
      }
    }
    return null;
  }

  function buscarOuFalhar(lista, id, mensagem) {
    var item = buscarNaLista(lista, id);
    if (!item) {
      falhar(mensagem);
    }
    return item;
  }

  function gerarId(banco, tabela) {
    var id = banco.proximoId[tabela];
    banco.proximoId[tabela] = id + 1;
    return id;
  }

  // Data de início de um período de relatório ("últimos 30 dias")
  function inicioDoPeriodo(dias) {
    return datas.somarDias(datas.inicioDoDia(new Date()), -(dias || 90));
  }

  /* ---------- Pacientes ---------- */

  // Limpa o que veio do formulário: tira máscaras, espaços e garante os tipos
  function normalizarPaciente(dados) {
    return {
      nome: String(dados.nome || '').trim().replace(/\s+/g, ' '),
      cpf: validacao.somenteDigitos(dados.cpf),
      cartaoSus: validacao.somenteDigitos(dados.cartaoSus),
      dataNascimento: dados.dataNascimento || '',
      telefone: validacao.somenteDigitos(dados.telefone),
      bairro: String(dados.bairro || '').trim(),
      contatoPreferido: dados.contatoPreferido,
      aceitaEncaixe: dados.aceitaEncaixe === true,
      gestante: dados.gestante === true,
      pcd: dados.pcd === true
    };
  }

  // CPF e cartão SUS são únicos. Na edição, o próprio paciente não conta.
  function verificarUnicidade(banco, paciente, idIgnorado) {
    banco.pacientes.forEach(function (outro) {
      if (outro.id === idIgnorado) {
        return;
      }
      if (outro.cpf === paciente.cpf) {
        falhar('Este CPF já está cadastrado para ' + outro.nome + '.', 'cpf');
      }
      if (outro.cartaoSus === paciente.cartaoSus) {
        falhar('Este cartão SUS já está cadastrado para ' + outro.nome + '.', 'cartaoSus');
      }
    });
  }

  var pacientes = {
    listar: function () {
      return executar(function () {
        return lerBanco().pacientes.slice().sort(function (a, b) {
          return a.nome.localeCompare(b.nome, 'pt-BR');
        });
      });
    },
    buscar: function (id) {
      return executar(function () {
        return buscarOuFalhar(lerBanco().pacientes, id, 'Paciente não encontrado.');
      });
    },
    criar: function (dados) {
      return executar(function () {
        var banco = lerBanco();
        var paciente = normalizarPaciente(dados);
        falharSeTiverErros(validacao.validarPaciente(paciente, new Date()));
        verificarUnicidade(banco, paciente, null);
        paciente.id = gerarId(banco, 'pacientes');
        banco.pacientes.push(paciente);
        salvarBanco(banco);
        return paciente;
      });
    },
    atualizar: function (id, dados) {
      return executar(function () {
        var banco = lerBanco();
        var atual = buscarOuFalhar(banco.pacientes, id, 'Paciente não encontrado.');
        var paciente = normalizarPaciente(dados);
        falharSeTiverErros(validacao.validarPaciente(paciente, new Date()));
        verificarUnicidade(banco, paciente, atual.id);
        paciente.id = atual.id;
        banco.pacientes[banco.pacientes.indexOf(atual)] = paciente;
        salvarBanco(banco);
        return paciente;
      });
    },
    excluir: function (id) {
      return executar(function () {
        var banco = lerBanco();
        var paciente = buscarOuFalhar(banco.pacientes, id, 'Paciente não encontrado.');
        // Regra 6: imita a chave estrangeira do banco
        var bloqueio = regras.verificarExclusaoPaciente(paciente.id, banco.consultas, banco.fila, new Date());
        if (bloqueio) {
          falhar(bloqueio);
        }
        banco.pacientes.splice(banco.pacientes.indexOf(paciente), 1);
        salvarBanco(banco);
      });
    }
  };

  /* ---------- Fila de espera ---------- */

  function normalizarRegistroFila(dados) {
    return {
      pacienteId: Number(dados.pacienteId) || null,
      especialidadeId: Number(dados.especialidadeId) || null,
      ubsId: Number(dados.ubsId) || null,
      dataEntrada: dados.dataEntrada || '',
      classificacaoRisco: dados.classificacaoRisco
    };
  }

  function validarRegistroFilaNoBanco(banco, registro, idIgnorado) {
    falharSeTiverErros(validacao.validarRegistroFila(registro, new Date()));
    buscarOuFalhar(banco.pacientes, registro.pacienteId, 'Paciente não encontrado.');
    buscarOuFalhar(banco.especialidades, registro.especialidadeId, 'Especialidade não encontrada.');
    buscarOuFalhar(banco.ubs, registro.ubsId, 'UBS não encontrada.');
    var duplicado = regras.verificarDuplicidadeNaFila(registro, banco.fila, banco.especialidades, idIgnorado);
    if (duplicado) {
      falhar(duplicado, 'especialidadeId');
    }
  }

  var fila = {
    listar: function () {
      return executar(function () {
        return lerBanco().fila;
      });
    },
    buscar: function (id) {
      return executar(function () {
        return buscarOuFalhar(lerBanco().fila, id, 'Esta pessoa não está na fila de espera.');
      });
    },
    criar: function (dados) {
      return executar(function () {
        var banco = lerBanco();
        var registro = normalizarRegistroFila(dados);
        validarRegistroFilaNoBanco(banco, registro, null);
        registro.id = gerarId(banco, 'fila');
        registro.status = 'AGUARDANDO';
        registro.dataSaida = null;
        banco.fila.push(registro);
        salvarBanco(banco);
        return registro;
      });
    },
    atualizar: function (id, dados) {
      return executar(function () {
        var banco = lerBanco();
        var atual = buscarOuFalhar(banco.fila, id, 'Esta pessoa não está na fila de espera.');
        if (atual.status !== 'AGUARDANDO') {
          falhar('Só dá para editar quem ainda está aguardando na fila.');
        }
        var registro = normalizarRegistroFila(dados);
        validarRegistroFilaNoBanco(banco, registro, atual.id);
        Object.assign(atual, registro);
        salvarBanco(banco);
        return atual;
      });
    },
    // "Remover da fila" não apaga: muda o status para REMOVIDO e anota a
    // data de saída, para o histórico e os relatórios continuarem certos.
    excluir: function (id) {
      return executar(function () {
        var banco = lerBanco();
        var registro = buscarOuFalhar(banco.fila, id, 'Esta pessoa não está na fila de espera.');
        if (registro.status !== 'AGUARDANDO') {
          falhar('Este paciente já saiu da fila.');
        }
        registro.status = 'REMOVIDO';
        registro.dataSaida = datas.paraIsoData(new Date());
        salvarBanco(banco);
        return registro;
      });
    }
  };

  /* ---------- Consultas ---------- */

  function normalizarConsulta(dados) {
    var dataHora = dados.dataHora || '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dataHora)) {
      dataHora = dataHora + ':00';    // o <input type="datetime-local"> não manda os segundos
    }
    return {
      pacienteId: Number(dados.pacienteId) || null,
      profissionalId: Number(dados.profissionalId) || null,
      ubsId: Number(dados.ubsId) || null,
      dataHora: dataHora
    };
  }

  function validarConsultaNoBanco(banco, consulta, idIgnorado) {
    var agora = new Date();
    falharSeTiverErros(validacao.validarConsulta(consulta, agora));
    buscarOuFalhar(banco.pacientes, consulta.pacienteId, 'Paciente não encontrado.');
    buscarOuFalhar(banco.profissionais, consulta.profissionalId, 'Profissional não encontrado.');
    buscarOuFalhar(banco.ubs, consulta.ubsId, 'UBS não encontrada.');
    var mensagem = regras.validarAgendamento(
      { id: idIgnorado, pacienteId: consulta.pacienteId, profissionalId: consulta.profissionalId, ubsId: consulta.ubsId, dataHora: consulta.dataHora },
      { consultas: banco.consultas, profissionais: banco.profissionais, profissionalUbs: banco.profissionalUbs, ubs: banco.ubs, agora: agora }
    );
    if (mensagem) {
      falhar(mensagem, 'dataHora');
    }
  }

  // Muda o status de uma consulta, depois de conferir se a mudança faz sentido
  function mudarStatus(id, conferir, mudar) {
    return executar(function () {
      var banco = lerBanco();
      var consulta = buscarOuFalhar(banco.consultas, id, 'Consulta não encontrada.');
      conferir(consulta, new Date());
      mudar(consulta);
      salvarBanco(banco);
      return consulta;
    });
  }

  // Presença e falta só podem ser registradas no dia da consulta ou depois
  function conferirSeJaEhODia(consulta, agora) {
    if (!regras.estaAtiva(consulta)) {
      falhar('Só dá para registrar presença ou falta de uma consulta agendada ou confirmada.');
    }
    if (datas.paraData(consulta.dataHora) > agora && !datas.mesmoDia(datas.paraData(consulta.dataHora), agora)) {
      falhar('Presença e falta só podem ser registradas no dia da consulta.');
    }
  }

  var consultas = {
    listar: function () {
      return executar(function () {
        return lerBanco().consultas;
      });
    },
    buscar: function (id) {
      return executar(function () {
        return buscarOuFalhar(lerBanco().consultas, id, 'Consulta não encontrada.');
      });
    },
    criar: function (dados) {
      return executar(function () {
        var banco = lerBanco();
        var consulta = normalizarConsulta(dados);
        validarConsultaNoBanco(banco, consulta, null);
        var profissional = buscarNaLista(banco.profissionais, consulta.profissionalId);
        consulta.id = gerarId(banco, 'consultas');
        consulta.especialidadeId = profissional.especialidadeId;   // sempre igual à do profissional
        consulta.status = 'AGENDADA';
        consulta.origem = 'NORMAL';
        consulta.motivoFalta = null;
        banco.consultas.push(consulta);
        salvarBanco(banco);
        return consulta;
      });
    },
    // Editar uma consulta = remarcar (paciente, profissional, UBS, dia e hora)
    atualizar: function (id, dados) {
      return executar(function () {
        var banco = lerBanco();
        var atual = buscarOuFalhar(banco.consultas, id, 'Consulta não encontrada.');
        if (!regras.estaAtiva(atual)) {
          falhar('Só dá para mudar uma consulta agendada ou confirmada.');
        }
        var consulta = normalizarConsulta(dados);
        validarConsultaNoBanco(banco, consulta, atual.id);
        Object.assign(atual, consulta);
        atual.especialidadeId = buscarNaLista(banco.profissionais, consulta.profissionalId).especialidadeId;
        salvarBanco(banco);
        return atual;
      });
    },
    excluir: function (id) {
      return executar(function () {
        var banco = lerBanco();
        var consulta = buscarOuFalhar(banco.consultas, id, 'Consulta não encontrada.');
        banco.consultas.splice(banco.consultas.indexOf(consulta), 1);
        salvarBanco(banco);
      });
    },
    confirmar: function (id) {
      return mudarStatus(id, function (consulta, agora) {
        if (consulta.status === 'CONFIRMADA') { falhar('Esta consulta já está confirmada.'); }
        if (consulta.status !== 'AGENDADA') { falhar('Só dá para confirmar uma consulta agendada.'); }
        if (regras.jaPassou(consulta, agora)) { falhar('Esta consulta já passou.'); }
      }, function (consulta) {
        consulta.status = 'CONFIRMADA';
      });
    },
    cancelar: function (id) {
      return mudarStatus(id, function (consulta, agora) {
        if (consulta.status === 'CANCELADA') { falhar('Esta consulta já foi cancelada.'); }
        if (!regras.estaAtiva(consulta)) { falhar('Só dá para cancelar uma consulta agendada ou confirmada.'); }
        if (regras.jaPassou(consulta, agora)) { falhar('Esta consulta já passou. Registre a presença ou a falta.'); }
      }, function (consulta) {
        consulta.status = 'CANCELADA';
      });
    },
    registrarFalta: function (id, motivo) {
      return mudarStatus(id, function (consulta, agora) {
        if (MOTIVOS_DE_FALTA.indexOf(motivo) === -1) { falhar('Escolha o motivo da falta.', 'motivoFalta'); }
        conferirSeJaEhODia(consulta, agora);
      }, function (consulta) {
        consulta.status = 'FALTA';
        consulta.motivoFalta = motivo;
      });
    },
    registrarRealizada: function (id) {
      return mudarStatus(id, conferirSeJaEhODia, function (consulta) {
        consulta.status = 'REALIZADA';
      });
    },
    // Página do cidadão: todas as consultas do paciente dono do cartão, em ordem de horário
    buscarPorCartaoSus: function (cartaoSus) {
      return executar(function () {
        var erro = validacao.validarCartaoSus(cartaoSus);
        if (erro) {
          falhar(erro, 'cartaoSus');
        }
        var numeros = validacao.somenteDigitos(cartaoSus);
        var banco = lerBanco();
        var paciente = banco.pacientes.filter(function (p) { return p.cartaoSus === numeros; })[0];
        if (!paciente) {
          falhar('Não encontramos este cartão SUS. Confira os 15 números ou fale com a recepção da sua UBS.', 'cartaoSus');
        }
        return banco.consultas
          .filter(function (consulta) { return consulta.pacienteId === paciente.id; })
          .sort(function (a, b) { return a.dataHora < b.dataHora ? -1 : 1; });
      });
    }
  };

  /* ---------- Encaixe ---------- */

  // Confere se a consulta é uma vaga que ainda pode receber encaixe
  function buscarVagaLivre(banco, consultaId) {
    var vaga = buscarOuFalhar(banco.consultas, consultaId, 'Consulta não encontrada.');
    var agora = new Date();
    if (vaga.status !== 'CANCELADA') {
      falhar('Esta consulta não foi cancelada. Só uma vaga livre pode receber encaixe.');
    }
    if (regras.jaPassou(vaga, agora)) {
      falhar('O horário desta vaga já passou.');
    }
    if (!regras.vagaEstaLivre(vaga, banco.consultas, agora)) {
      falhar('Esta vaga já foi ocupada por um encaixe.');
    }
    return vaga;
  }

  // O que a tela de encaixe precisa saber de cada candidato
  function resumirCandidato(candidato) {
    return {
      filaId: candidato.registroFila.id,
      pacienteId: candidato.paciente.id,
      nome: candidato.paciente.nome,
      idade: candidato.idade,
      telefone: candidato.paciente.telefone,
      contatoPreferido: candidato.paciente.contatoPreferido,
      classificacaoRisco: candidato.registroFila.classificacaoRisco,
      dataEntrada: candidato.registroFila.dataEntrada,
      tempoNaFila: candidato.tempoNaFila,
      motivos: candidato.motivos
    };
  }

  function calcularCandidatos(banco, vaga) {
    return regras.listarCandidatosEncaixe(vaga, banco.fila, banco.pacientes, banco.consultas, banco.ubs, new Date());
  }

  var encaixe = {
    candidatos: function (consultaId) {
      return executar(function () {
        var banco = lerBanco();
        var vaga = buscarVagaLivre(banco, consultaId);
        return calcularCandidatos(banco, vaga).map(resumirCandidato);
      });
    },
    confirmar: function (consultaId, filaId) {
      return executar(function () {
        var banco = lerBanco();
        var vaga = buscarVagaLivre(banco, consultaId);
        // Confere de novo, na hora de gravar: a fila pode ter mudado
        var candidato = calcularCandidatos(banco, vaga).filter(function (c) {
          return c.registroFila.id === Number(filaId);
        })[0];
        if (!candidato) {
          falhar('Este paciente não pode ser encaixado nesta vaga.');
        }
        var resultado = regras.encaixar(vaga, candidato.registroFila, new Date());
        resultado.consulta.id = gerarId(banco, 'consultas');
        banco.consultas.push(resultado.consulta);
        var registro = buscarNaLista(banco.fila, candidato.registroFila.id);
        Object.assign(registro, resultado.registroFila);
        salvarBanco(banco);
        return {
          consulta: resultado.consulta,
          candidato: resumirCandidato(candidato)
        };
      });
    }
  };

  /* ---------- Relatórios ----------
     No sistema final, cada um destes é uma consulta SQL com JOIN e
     GROUP BY no Java. Aqui fazemos a mesma conta com laços, e o SQL
     equivalente está no comentário de cada função. */

  function contarPorChave(lista, chave) {
    var contagem = {};
    lista.forEach(function (item) {
      var valor = item[chave];
      contagem[valor] = (contagem[valor] || 0) + 1;
    });
    return contagem;
  }

  function consultasDoPeriodo(banco, dias) {
    var inicio = inicioDoPeriodo(dias);
    return banco.consultas.filter(function (consulta) {
      return datas.paraData(consulta.dataHora) >= inicio;
    });
  }

  // Taxa de faltas agrupada por UBS ou por especialidade
  function taxaDeFaltasPor(banco, dias, lista, chave) {
    var atendidasOuFaltas = consultasDoPeriodo(banco, dias).filter(function (consulta) {
      return consulta.status === 'FALTA' || consulta.status === 'REALIZADA';
    });
    return lista.map(function (item) {
      var doGrupo = atendidasOuFaltas.filter(function (consulta) { return consulta[chave] === item.id; });
      var faltas = doGrupo.filter(function (consulta) { return consulta.status === 'FALTA'; }).length;
      return {
        id: item.id,
        nome: item.nome,
        total: doGrupo.length,
        faltas: faltas,
        taxa: doGrupo.length > 0 ? faltas / doGrupo.length : 0
      };
    }).sort(function (a, b) { return b.taxa - a.taxa; });
  }

  var relatorios = {
    /* SELECT u.id, u.nome, COUNT(*) AS total,
              SUM(CASE WHEN c.status = 'FALTA' THEN 1 ELSE 0 END) AS faltas
         FROM consulta c JOIN ubs u ON u.id = c.ubs_id
        WHERE c.status IN ('FALTA', 'REALIZADA') AND c.data_hora >= :inicio
        GROUP BY u.id, u.nome */
    faltasPorUbs: function (dias) {
      return executar(function () {
        var banco = lerBanco();
        return taxaDeFaltasPor(banco, dias, banco.ubs, 'ubsId');
      });
    },
    /* Igual ao anterior, com JOIN em especialidade e GROUP BY e.id, e.nome */
    faltasPorEspecialidade: function (dias) {
      return executar(function () {
        var banco = lerBanco();
        return taxaDeFaltasPor(banco, dias, banco.especialidades, 'especialidadeId');
      });
    },
    /* SELECT u.id, u.nome, c.motivo_falta, COUNT(*) AS quantidade
         FROM consulta c JOIN ubs u ON u.id = c.ubs_id
        WHERE c.status = 'FALTA' AND c.data_hora >= :inicio
        GROUP BY u.id, u.nome, c.motivo_falta
       Devolve uma linha por UBS e motivo, como o resultado do SQL. */
    motivosFalta: function (dias) {
      return executar(function () {
        var banco = lerBanco();
        var faltas = consultasDoPeriodo(banco, dias).filter(function (consulta) {
          return consulta.status === 'FALTA';
        });
        var linhas = [];
        banco.ubs.forEach(function (ubs) {
          var daUbs = faltas.filter(function (consulta) { return consulta.ubsId === ubs.id; });
          var porMotivo = contarPorChave(daUbs, 'motivoFalta');
          MOTIVOS_DE_FALTA.forEach(function (motivo) {
            if (porMotivo[motivo]) {
              linhas.push({ ubsId: ubs.id, ubsNome: ubs.nome, motivo: motivo, quantidade: porMotivo[motivo] });
            }
          });
        });
        return linhas;
      });
    },
    /* Vagas liberadas (consultas canceladas) e vagas reocupadas (consultas de encaixe):
       SELECT u.id, u.nome,
              SUM(CASE WHEN c.status = 'CANCELADA' THEN 1 ELSE 0 END) AS liberadas,
              SUM(CASE WHEN c.origem = 'ENCAIXE' THEN 1 ELSE 0 END) AS reocupadas
         FROM consulta c JOIN ubs u ON u.id = c.ubs_id
        WHERE c.data_hora >= :inicio
        GROUP BY u.id, u.nome */
    reaproveitamento: function (dias) {
      return executar(function () {
        var banco = lerBanco();
        var doPeriodo = consultasDoPeriodo(banco, dias);
        return banco.ubs.map(function (ubs) {
          var daUbs = doPeriodo.filter(function (consulta) { return consulta.ubsId === ubs.id; });
          return {
            id: ubs.id,
            nome: ubs.nome,
            liberadas: daUbs.filter(function (consulta) { return consulta.status === 'CANCELADA'; }).length,
            reocupadas: daUbs.filter(function (consulta) { return consulta.origem === 'ENCAIXE'; }).length
          };
        });
      });
    },
    /* Quem está aguardando hoje, por especialidade (o período não se aplica):
       SELECT e.id, e.nome, COUNT(*) AS quantidade,
              AVG(CURRENT_DATE - f.data_entrada) AS espera_media_dias
         FROM fila_espera f JOIN especialidade e ON e.id = f.especialidade_id
        WHERE f.status = 'AGUARDANDO'
        GROUP BY e.id, e.nome */
    filaPorEspecialidade: function () {
      return executar(function () {
        var banco = lerBanco();
        var hoje = new Date();
        var aguardando = banco.fila.filter(function (registro) { return registro.status === 'AGUARDANDO'; });
        return banco.especialidades.map(function (especialidade) {
          var daEspecialidade = aguardando.filter(function (registro) { return registro.especialidadeId === especialidade.id; });
          var somaDosDias = 0;
          daEspecialidade.forEach(function (registro) {
            somaDosDias = somaDosDias + datas.diasEntre(registro.dataEntrada, hoje);
          });
          return {
            id: especialidade.id,
            nome: especialidade.nome,
            quantidade: daEspecialidade.length,
            esperaMediaDias: daEspecialidade.length > 0 ? Math.round(somaDosDias / daEspecialidade.length) : 0
          };
        }).sort(function (a, b) { return b.quantidade - a.quantidade; });
      });
    }
  };

  /* ---------- Listas fixas e restauração ---------- */

  function listarTabela(tabela) {
    return {
      listar: function () {
        return executar(function () {
          return lerBanco()[tabela];
        });
      }
    };
  }

  return {
    pacientes: pacientes,
    fila: fila,
    consultas: consultas,
    encaixe: encaixe,
    relatorios: relatorios,
    ubs: listarTabela('ubs'),
    especialidades: listarTabela('especialidades'),
    profissionais: listarTabela('profissionais'),
    profissionalUbs: listarTabela('profissionalUbs'),
    // Volta tudo ao estado inicial, com as datas recalculadas a partir de agora
    restaurarDadosExemplo: function () {
      return executar(function () {
        salvarBanco(Encaixe.gerarDadosExemplo(new Date()));
        return true;
      });
    }
  };
})();


/* =====================================================================
   Modo servidor (backend Java)
   Segue o contrato REST combinado com o grupo. O Java precisa responder
   com o cabeçalho "Access-Control-Allow-Origin: *", porque a página
   abre via file:// e o navegador bloquearia a resposta sem ele.
   ===================================================================== */
Encaixe.modoServidor = (function () {

  // Faz a requisição e devolve o JSON da resposta.
  // Se o servidor responder com erro (HTTP 400), ele manda {"erro": "mensagem"}.
  function requisicao(metodo, caminho, corpo) {
    var opcoes = { method: metodo, headers: {} };
    if (corpo !== undefined) {
      opcoes.headers['Content-Type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    return fetch(Encaixe.config.urlServidor + caminho, opcoes)
      .catch(function () {
        // fetch só cai aqui quando nem chegou no servidor (desligado, sem rede)
        throw new Error('Não foi possível falar com o servidor. Confira se o Java está rodando em ' + Encaixe.config.urlServidor + '.');
      })
      .then(function (resposta) {
        if (resposta.status === 204) {
          return null;   // "No Content": deu certo, mas não há corpo
        }
        return resposta.json().then(function (json) {
          if (!resposta.ok) {
            var erro = new Error(json && json.erro ? json.erro : 'O servidor recusou o pedido.');
            if (json && json.campo) {
              erro.campo = json.campo;
            }
            throw erro;
          }
          return json;
        });
      });
  }

  // CRUD padrão: GET, GET /{id}, POST, PUT /{id} e DELETE /{id}
  function crud(caminho) {
    return {
      listar: function () { return requisicao('GET', caminho); },
      buscar: function (id) { return requisicao('GET', caminho + '/' + id); },
      criar: function (dados) { return requisicao('POST', caminho, dados); },
      atualizar: function (id, dados) { return requisicao('PUT', caminho + '/' + id, dados); },
      excluir: function (id) { return requisicao('DELETE', caminho + '/' + id); }
    };
  }

  function somenteListar(caminho) {
    return { listar: function () { return requisicao('GET', caminho); } };
  }

  var consultas = crud('/consultas');
  consultas.confirmar = function (id) { return requisicao('POST', '/consultas/' + id + '/confirmar'); };
  consultas.cancelar = function (id) { return requisicao('POST', '/consultas/' + id + '/cancelar'); };
  consultas.registrarFalta = function (id, motivo) { return requisicao('POST', '/consultas/' + id + '/falta', { motivo: motivo }); };
  consultas.registrarRealizada = function (id) { return requisicao('POST', '/consultas/' + id + '/realizada'); };
  consultas.buscarPorCartaoSus = function (cartaoSus) {
    var numeros = Encaixe.validacao.somenteDigitos(cartaoSus);
    return requisicao('GET', '/consultas?cartaoSus=' + encodeURIComponent(numeros));
  };

  function relatorio(caminho) {
    return function (dias) {
      return requisicao('GET', '/relatorios/' + caminho + '?dias=' + (dias || 90));
    };
  }

  return {
    pacientes: crud('/pacientes'),
    fila: crud('/fila'),
    consultas: consultas,
    encaixe: {
      candidatos: function (consultaId) {
        return requisicao('GET', '/encaixe/candidatos?consultaId=' + encodeURIComponent(consultaId));
      },
      confirmar: function (consultaId, filaId) {
        return requisicao('POST', '/encaixe', { consultaId: consultaId, filaId: filaId });
      }
    },
    relatorios: {
      faltasPorUbs: relatorio('faltas-por-ubs'),
      faltasPorEspecialidade: relatorio('faltas-por-especialidade'),
      motivosFalta: relatorio('motivos-falta'),
      reaproveitamento: relatorio('reaproveitamento'),
      filaPorEspecialidade: relatorio('fila-por-especialidade')
    },
    ubs: somenteListar('/ubs'),
    especialidades: somenteListar('/especialidades'),
    profissionais: somenteListar('/profissionais'),
    profissionalUbs: somenteListar('/profissional-ubs'),
    restaurarDadosExemplo: function () {
      return Promise.reject(new Error('No modo servidor, os dados de demonstração são restaurados pelo script SQL do banco.'));
    }
  };
})();


/* A escolha do modo: as páginas sempre usam Encaixe.api */
Encaixe.api = Encaixe.config.modo === 'servidor' ? Encaixe.modoServidor : Encaixe.modoLocal;
