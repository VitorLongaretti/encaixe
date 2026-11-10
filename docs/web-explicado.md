# A web do Encaixe, explicada

Este documento é para o grupo estudar antes da banca. Ele explica o que cada arquivo faz, o caminho que o código percorre num clique, as regras de negócio com exemplos da demonstração e as perguntas que os professores podem fazer.

---

## Visão geral em uma frase

**As páginas só conversam com `Encaixe.api`. A api usa as regras (`regras.js`) e a validação (`validacao.js`) e guarda os dados no `localStorage`, ou no Java, no modo servidor.**

```
   página (ex.: agenda.js)
        │  chama
        ▼
   Encaixe.api  (api.js) ──── usa ───▶  Encaixe.regras (regras.js)
        │                               Encaixe.validacao (validacao.js)
        ▼
   localStorage  ou  Java (fetch)
```

Não usamos `import`/`export` porque o Chrome bloqueia módulos quando a página abre por `file://`. Cada arquivo pendura o que exporta num objeto global, `window.Encaixe`, e os scripts são carregados com `defer` numa ordem fixa: `dados-exemplo.js`, `validacao.js`, `regras.js`, `api.js`, `ui.js` e, por último, o JS da página.

---

## O papel de cada arquivo

### HTML

| Arquivo | O que faz |
|---|---|
| `index.html` | Conta a história: o problema, como funciona, quem participa e o impacto. A demonstração animada do hero é só HTML e CSS. |
| `painel.html` | O resumo do dia da UBS: os números do dia, as não confirmadas, as vagas livres e os últimos encaixes. |
| `agenda.html` | A folha do dia, com uma linha a cada 20 minutos. É onde a recepção confirma, cancela, registra presença ou falta e encaixa. |
| `fila.html` | CRUD da fila de espera. A lista vem na mesma ordem da regra de encaixe. |
| `pacientes.html` | CRUD completo de pacientes. É o modelo de qualidade das outras telas. |
| `relatorios.html` | Cinco gráficos de barras feitos só com CSS, cada um com uma frase de conclusão. |
| `minha-consulta.html` | A página do cidadão: confirmar ou cancelar só com o cartão SUS. |

O cabeçalho, o menu e o rodapé estão escritos em HTML em cada página, e não são injetados por JavaScript. Assim, o HTML semântico aparece no código-fonte, e o menu funciona mesmo com o JS desligado.

### CSS

| Arquivo | O que faz |
|---|---|
| `css/style.css` | Um único arquivo, dividido em 15 seções numeradas. A seção 1 guarda todos os tokens (cores, espaços, tamanhos), e a seção 10 tem a animação do marca-texto. |

### JavaScript

| Arquivo | O que faz |
|---|---|
| `js/dados-exemplo.js` | Gera os dados de demonstração com datas relativas a hoje, para a demonstração funcionar em qualquer dia. Também monta o cenário do pitch. |
| `js/validacao.js` | Validadores: CPF (com os dígitos verificadores), cartão SUS, telefone, nome e datas. Devolvem a mensagem de erro, ou `null` quando está tudo certo. |
| `js/regras.js` | As regras de negócio, como funções puras: prioridade legal, não confirmada, candidatos ao encaixe e a ordem entre eles, encaixar, validações de agendamento e exclusão de paciente. Também tem `Encaixe.datas`, as funções de apoio para datas. |
| `js/api.js` | A camada de dados. Tem o modo local (`localStorage`) e o modo servidor (`fetch`), com as mesmas funções. Toda função devolve uma Promise. |
| `js/ui.js` | Peças comuns: os ícones SVG, a formatação de datas e máscaras, os toasts, os erros nos campos, o menu do celular e o "Restaurar dados". |
| `js/paginas/*.js` | O JS de cada página. Cada um lê a tela, chama a api e desenha o resultado. |

---

## O caminho de um clique: "Aceitou"

É o momento-chave do pitch. A recepção ofereceu a vaga das 9h20 para Maria Aparecida, e ela aceitou.

1. **O clique.** O botão "Aceitou" tem `data-painel="aceitou"` e `data-fila="ID"`. Um único ouvinte de clique no painel, a função `cliqueNoPainel` do `agenda.js`, descobre qual botão foi clicado e chama `responderOferta('aceitou', filaId)`.
2. **A api.** `responderOferta` chama `Encaixe.api.encaixe.confirmar(vagaId, filaId)`. Ela devolve uma Promise, então a página espera a resposta com `.then()`.
3. **As conferências** (`api.js`, `encaixe.confirmar`):
   - `lerBanco()` lê o JSON do `localStorage`.
   - `buscarVagaLivre()` confere três coisas: a consulta foi CANCELADA, ainda não passou e ninguém ocupou o horário (`regras.vagaEstaLivre`).
   - `calcularCandidatos()` refaz a lista com `regras.listarCandidatosEncaixe` e confere se Maria ainda está nela. A fila pode ter mudado desde que o painel abriu.
4. **A regra 4.** `regras.encaixar(vaga, registroDaFila, hoje)` monta dois objetos novos:
   - uma consulta para Maria, no mesmo horário, profissional e UBS, com `status: "CONFIRMADA"` e `origem: "ENCAIXE"`;
   - o registro de Maria na fila com `status: "ENCAIXADO"` e `dataSaida` igual a hoje.

   A consulta cancelada do Carlos não muda: ela fica para o histórico.
5. **Gravar.** A api gera o id da consulta nova, coloca tudo no banco e chama `salvarBanco()`, que grava no `localStorage`. Depois devolve `{ consulta, candidato }`.
6. **De volta à página.** `agenda.js` guarda o id da consulta nova em `estado.consultaQueAnima`, fecha o painel e recarrega a folha. Ao desenhar essa linha, `htmlDaLinhaDeConsulta` coloca as classes `linha--encaixe linha--animar`.
7. **A animação** (`style.css`, seção 10). A classe `linha--animar` liga os keyframes `passar-marca-texto`: o traço amarelo é revelado da esquerda para a direita em 600ms com `clip-path`, enquanto "Vaga livre" some e o nome aparece. Essa é a mesma animação do Início. Com `prefers-reduced-motion`, o traço aparece direto.
8. **O toast.** `ui.mostrarToast('Encaixe feito: Maria Aparecida esperava havia 14 meses na fila.', 'encaixe')` coloca a mensagem numa região com `role="status"`. O leitor de tela lê a mensagem sem interromper o que a pessoa está fazendo.
9. **O foco** volta para a linha encaixada, para quem usa teclado não se perder.

No modo servidor, os passos 3 a 5 acontecem no Java: a página faz um `POST /api/encaixe` e recebe o mesmo JSON de volta.

---

## As regras de negócio, com os dados da demonstração

As regras estão em `js/regras.js`. No sistema final, elas moram na camada service do Java, com exatamente a mesma lógica.

### 1. Prioridade legal: `temPrioridadeLegal(paciente)`
Tem prioridade quem tem 60 anos ou mais, é gestante ou é PcD.
- Maria Aparecida, 68 anos: **tem**.
- Luana Martins, 29 anos e gestante: **tem**.
- João Batista, 41 anos: **não tem**.

### 2. Não confirmada: `estaNaoConfirmada(consulta, agora)`
É uma consulta AGENDADA, que ainda não passou e que é **hoje ou amanhã**. "Não confirmada" não é gravado no banco: o sistema calcula na hora.
- A consulta do Carlos é amanhã às 9h20, com status AGENDADA, então aparece como **Não confirmada**.

O briefing original falava em "24 horas ou menos". Trocamos pelo dia do calendário porque, com 24 horas, a consulta de amanhã às 9h20 só ficaria "não confirmada" depois das 9h20 de hoje, e a recepção não saberia de manhã para quem ligar. A regra nova também é mais fiel a "confirmar até a véspera".

### 3. Candidatos ao encaixe: `listarCandidatosEncaixe(vaga, fila, pacientes, consultas, listaUbs)`
**Quem entra:** registros AGUARDANDO, da mesma especialidade e UBS da vaga, de pacientes que aceitam encaixe e que não têm outra consulta no mesmo horário.

**A ordem**, critério por critério (só passa para o próximo se houver empate):
1. Risco: ALTA, depois MEDIA, depois BAIXA
2. Prioridade legal
3. Mora no bairro da UBS
4. Entrou na fila antes

Na vaga do Carlos (Ortopedia, UBS Jardim das Flores, que fica em Itaquera):

| Posição | Paciente | Por quê |
|---|---|---|
| 1º | Maria Aparecida Souza | Risco alto, 68 anos, mora em Itaquera, 14 meses na fila |
| 2º | João Batista Rocha | Risco alto, mas sem prioridade legal |
| 3º | Sebastiana Freitas | Espera há 20 meses, mais que todos, mas o risco é médio: **o risco vem primeiro** |
| 4º | Raimundo Nonato Silva | Mesmo risco e prioridade da Sebastiana, mas **não mora no bairro** |
| 5º | Luana Martins | Gestante, mas risco baixo |
| fora | Antônio Carlos Dias | Risco alto, mas **não aceita encaixe** |

Cada candidato volta com a lista de motivos ("Risco alto", "68 anos", "14 meses na fila", "Mora no bairro da UBS"), que a tela mostra como etiquetas.

### 4. Encaixar: `encaixar(vaga, registroFila, hoje)`
Cria a consulta nova (CONFIRMADA e ENCAIXE) e marca a fila como ENCAIXADO, com `dataSaida` igual a hoje. A consulta cancelada fica como está, para o histórico. É por isso que existe `vagaEstaLivre`: ela confere se ninguém já ocupou aquele horário.

### 5. Validações de agendamento: `validarAgendamento(dados, contexto)`
- Não dá para agendar no passado: "Escolha um horário a partir de agora."
- O profissional precisa atender naquela UBS naquele dia da semana (tabela ProfissionalUbs): "Dr. Paulo Menezes não atende na UBS Vila Nova às sextas."
- O profissional não pode ter duas consultas ativas no mesmo horário, e o paciente também não.
- Os horários vão de 20 em 20 minutos, das 7h00 às 16h40 (a última consulta termina às 17h). Isso fica em `validacao.validarHorarioConsulta`.

### 6. Excluir paciente: `verificarExclusaoPaciente(...)`
Bloqueia a exclusão de quem tem consulta futura ativa ou está aguardando na fila. Isso imita a chave estrangeira do banco.
- José Carlos Pereira tem consulta amanhã: "Este paciente tem 1 consulta futura. Cancele a consulta antes de excluir."
- Maria Aparecida está na fila: "Este paciente está aguardando na fila de espera. Remova da fila antes de excluir."

---

## A validação do CPF, passo a passo

Exemplo: o CPF **529.982.247-25**.

**Primeiro dígito.** Multiplicamos os 9 primeiros números por 10, 9, 8 ... 2 e somamos:
`5×10 + 2×9 + 9×8 + 9×7 + 8×6 + 2×5 + 2×4 + 4×3 + 7×2 = 295`.
O resto de 295 por 11 é 9. Como o resto não é 0 nem 1, o dígito é `11 − 9 = 2`. ✔

**Segundo dígito.** Repetimos com os 10 primeiros números (já com o 2), com pesos de 11 a 2:
`5×11 + 2×10 + 9×9 + 9×8 + 8×7 + 2×6 + 2×5 + 4×4 + 7×3 + 2×2 = 347`.
O resto de 347 por 11 é 6, então o dígito é `11 − 6 = 5`. ✔

CPFs com todos os números iguais (111.111.111-11) passam nessa conta, mas são inválidos. Por isso, eles são recusados antes. O código está em `validacao.js`, nas funções `calcularDigitoCpf`, `completarCpf` e `cpfEhValido`. O `dados-exemplo.js` usa `completarCpf` para gerar CPFs válidos na demonstração.

---

## Como trocar do modo local para o modo servidor

1. Em `web/js/api.js`, troque `modo: 'local'` por `modo: 'servidor'`.
2. Confira se `urlServidor` aponta para o Java (`http://localhost:8080/api`).
3. **O Java precisa enviar o cabeçalho `Access-Control-Allow-Origin: *`.** A página abre por `file://`, e sem esse cabeçalho o navegador bloqueia a resposta (CORS).

Nenhuma página muda, porque todas usam `Encaixe.api`, e as duas implementações têm as mesmas funções e devolvem Promises.

### Contrato REST (para o integrante do Java)

O JSON usa os mesmos nomes de campo do modelo de dados (`pacienteId`, `dataHora`, `classificacaoRisco`...). As datas são ISO na hora local (`"2026-11-10"` e `"2026-11-10T09:20:00"`).

| Método e caminho | O que faz |
|---|---|
| `GET /api/pacientes`, `GET /api/pacientes/{id}` | Lista e busca |
| `POST /api/pacientes`, `PUT /api/pacientes/{id}`, `DELETE /api/pacientes/{id}` | Cria, atualiza e exclui |
| *o mesmo padrão para* `/api/fila` *e* `/api/consultas` | No caso da fila, o `DELETE` muda o status para REMOVIDO |
| `POST /api/consultas/{id}/confirmar` | Confirma |
| `POST /api/consultas/{id}/cancelar` | Cancela |
| `POST /api/consultas/{id}/falta` | Corpo: `{"motivo": "TRANSPORTE"}` |
| `POST /api/consultas/{id}/realizada` | Registra a presença |
| `GET /api/consultas?cartaoSus=898001234567890` | Consultas do dono do cartão (página do cidadão) |
| `GET /api/ubs`, `GET /api/especialidades`, `GET /api/profissionais` | Listas fixas |
| `GET /api/profissional-ubs` | **Acrescentado:** quem atende em qual UBS e em que dia (formulário de agendamento) |
| `GET /api/encaixe/candidatos?consultaId=ID` | Candidatos, já na ordem |
| `POST /api/encaixe` | Corpo: `{"consultaId": 1, "filaId": 2}` |
| `GET /api/relatorios/faltas-por-ubs?dias=90` | **`?dias=` acrescentado** (30, 60 ou 90), por causa do filtro de período |
| `GET /api/relatorios/faltas-por-especialidade?dias=90` | |
| `GET /api/relatorios/motivos-falta?dias=90` | Uma linha por UBS e motivo, como o resultado do GROUP BY |
| `GET /api/relatorios/reaproveitamento?dias=90` | |
| `GET /api/relatorios/fila-por-especialidade` | Quem aguarda hoje, sem período |

**Erros:** o Java responde HTTP 400 com `{"erro": "mensagem"}`, e a página mostra a mensagem. Opcionalmente, a resposta pode trazer `"campo": "cpf"`, e então a página marca o campo certo no formulário.

O SQL equivalente de cada relatório está comentado em `api.js`, na parte de relatórios, e serve de ponto de partida para o Java.

---

## Decisões que tomamos (e por quê)

- **"Não confirmada" conta pelo dia do calendário, e não por 24 horas.** A explicação está na regra 2.
- **O bairro é uma lista fechada**, e não um campo de texto. O critério 3 compara o bairro do paciente com o da UBS, e com texto livre "itaquera" e "Itaquera " seriam bairros diferentes.
- **O toast do encaixe não diz "foi encaixada".** O cadastro não tem gênero, e não queremos adivinhar pelo nome. Por isso a frase é "Encaixe feito: Maria Aparecida esperava havia 14 meses na fila."
- **Presença e falta só podem ser registradas no dia da consulta.** Não faz sentido dizer hoje que alguém faltou amanhã.
- **A borda dos campos usa `--grafite`, e não `--pauta`.** O contorno de um campo precisa de contraste 3:1 (WCAG 1.4.11), e `--pauta` dá só 1,36:1.
- **O nome encaixado fica dentro de `<mark>`**, a tag do HTML que significa "destacado". No modo de alto contraste do Windows, o fundo amarelo sumiria, então o `<mark>` passa a usar a cor de destaque do próprio sistema.
- **A fila tem 30 registros:** os 20 que aguardam, mais 10 já encaixados no histórico. Eles servem para o Painel mostrar quanto cada pessoa esperou.
- **As anotações da recepção aparecem em itálico azul**, como escritas à caneta na agenda de papel. Exemplos: "Carlos Henrique cancelou", "Transporte", "Esperou 14 meses". Não são links, porque links sempre têm sublinhado.

---

## Perguntas que a banca pode fazer

**1. Por que não usaram framework (React, Bootstrap...)?**
Porque a regra da Global Solution é usar o que foi visto até a fase 7, e um framework faria o requisito web zerar. Além disso, a página precisa abrir com dois cliques, sem instalar nada. Fizemos tudo em HTML, CSS e JavaScript puro, inclusive os gráficos e os ícones.

**2. Como funciona a validação de CPF?**
Pelo algoritmo oficial dos dois dígitos verificadores (o exemplo está acima). Também recusamos CPFs com todos os números iguais. Além disso, o CPF é único: a api confere no salvar, inclusive na edição, ignorando o próprio paciente.

**3. Como vocês garantem o contraste?**
Calculamos a razão de contraste WCAG de cada par de cores. Todos os textos passam do AA (4,5:1). O menor é o grafite sobre o cinza claro, com 5,1:1. Os contornos dos campos passam de 3:1. Nenhuma informação depende só da cor: todo status tem ícone e texto.

**4. E se o paciente não tiver internet?**
Ele liga para a recepção, que confirma ou cancela pelo mesmo sistema, na Agenda ou no Painel. A página "Minha consulta" é um caminho a mais, e não o único.

**5. Onde ficam os dados?**
Na demonstração, no `localStorage` do navegador. A camada `api.js` já tem o modo servidor pronto com `fetch`: quando o Java estiver no ar, muda uma linha. As páginas nunca acessam o `localStorage` direto, só a api.

**6. Por que não usaram `import` e `export`?**
O Chrome bloqueia módulos JavaScript em páginas abertas por `file://`. Por isso, cada arquivo expõe as funções no objeto global `window.Encaixe`, e os scripts carregam com `defer` numa ordem fixa.

**7. Por que o risco vem antes do tempo de espera?**
Porque quem tem risco alto pode piorar esperando. O exemplo da demonstração é a Sebastiana: ela espera há 20 meses, mas tem risco médio, e por isso fica atrás de Maria e João, que têm risco alto. A prioridade legal (idosos, gestantes e PcD) vem em seguida, e o bairro ajuda quem consegue chegar rápido a uma consulta marcada em cima da hora.

**8. E se duas recepcionistas encaixarem a mesma vaga ao mesmo tempo?**
Na hora de gravar, a api confere de novo se a vaga ainda está livre e se o candidato ainda está na fila. A segunda tentativa recebe "Esta vaga já foi ocupada por um encaixe." No Java, essa conferência fica dentro de uma transação.

**9. Por que "Não confirmada" não é gravado no banco?**
Porque é calculado: depende de hoje. Uma consulta AGENDADA para daqui a 5 dias ainda não está atrasada, e amanhã passa a estar. Se fosse gravado, alguém teria que atualizar o banco todo dia.

**10. Como são feitos os gráficos sem biblioteca?**
Cada barra é um `<span>` com a largura em porcentagem, como `style="width: 80%"`. A maior barra ocupa a largura toda. O valor de verdade aparece escrito ao lado, então o leitor de tela lê os números mesmo sem ver as barras.

**11. A página funciona para quem usa leitor de tela ou só teclado?**
Sim. Há o link "Pular para o conteúdo", landmarks (`header`, `nav`, `main`, `footer`) e foco visível em tudo. Os dialogs são o `<dialog>` nativo, que prende o foco e fecha com Esc. Os erros ficam ligados aos campos por `aria-describedby`, e os toasts são anunciados por uma região `aria-live`.

**12. Vocês guardam dados sensíveis?**
Só o necessário para a agenda: nome, documentos, contato, a classificação de risco e as flags de prioridade. Diagnóstico nunca entra no sistema. A página do cidadão nem mostra o nome da pessoa: só o dia, o horário, o local e a especialidade.

**13. Como a demonstração funciona em qualquer dia?**
Os dados de exemplo são gerados com datas relativas a hoje: "amanhã às 9h20", "há 14 meses". O link "Restaurar dados de demonstração" recalcula tudo, e por isso restauramos logo antes de gravar o pitch.

**14. Por que a mesma animação aparece no Início e na Agenda?**
O marca-texto é a assinatura do produto: ele só aparece quando uma vaga é salva. No Início, ele mostra em 2 segundos o que o sistema faz. Na Agenda, é o momento em que isso acontece de verdade. São os mesmos keyframes, ligados pela mesma classe CSS.
