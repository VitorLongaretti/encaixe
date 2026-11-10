# Encaixe: briefing do projeto (Global Solution FIAP 2026/2)

Este arquivo dá a você, Claude Code, todo o contexto do projeto. Leia inteiro antes de escrever qualquer código. Ele foi escrito numa conversa anterior que você não viu, e as decisões aqui já foram tomadas com cuidado: siga-as. Se achar que alguma está errada, explique por quê e pergunte antes de mudar.

---

## 0. Como trabalhar comigo

- Responda sempre em português do Brasil.
- Eu sou o Vitor, aluno do 2º ano de Engenharia de Software na FIAP e o responsável pelo front-end do grupo. Vou ter que explicar este código pra uma banca de professores, então:
  - Escreva código simples e legível pra um aluno de 2º ano. Prefira clareza a esperteza: nada de one-liners obscuros.
  - Comente em português o **porquê** das partes importantes, não o óbvio.
  - Use nomes em português, iguais aos do modelo de dados (seção 5).
- Trabalhe **por fases** (seção 15). No início de cada fase, me mostre um plano curto. No fim de cada fase, pare, me diga como testar e espere meu ok antes de seguir.
- **Não faça commits nem rode comandos de Git.** Eu cuido do Git, porque os commits de cada integrante contam na avaliação.
- Não instale nada nem crie `package.json`. O projeto não tem build.

---

## 1. Contexto: o que é a Global Solution

A Global Solution é a atividade final do semestre na FIAP, e o tema desta edição é **CitizenTech: tecnologia com o cidadão no centro**. O grupo precisa escolher um problema real e entregar um MVP, avaliado em 20 pontos:

| Parte | Pontos | O que é |
|---|---|---|
| Java + JDBC | 7 | Backend orientado a objetos, com CRUD no banco (outro integrante) |
| Banco | 4 | Diagrama ER e script `.sql` (outro integrante) |
| **Web** | **4** | **Interface web. É o que você vai construir.** |
| Vídeo pitch | 5 | Até 3 minutos, mostrando o sistema funcionando, sem slides |

**Critérios da parte web (4 pts):**
1. **Navegação (1 pt):** pelo menos 3 páginas ligadas por um menu igual em todas, com HTML semântico.
2. **Telas do CRUD (2 pts):** formulários e listagens das entidades principais, com validação em JS e mensagens na própria página.
3. **Responsivo e bem desenhado (1 pt):** funciona no celular e no desktop, com bom design visual e contraste legível.

**Diferenciais.** Não somam nota, mas decidem o vencedor entre os melhores:
- Web ligada ao backend: lê e grava dados reais do banco (vamos preparar isso na seção 7).
- Relatórios com SQL (JOIN e agregação) que geram informação útil (a página de relatórios mostra isso).
- Validação com gente real e repositório no GitHub com README completo.

**Checklist oficial:** o `index.html` precisa abrir direto no navegador, com dois cliques no arquivo, e funcionar no celular.

**Regra crítica:** "Use tudo o que foi visto até a fase 7. Tecnologias fora do conteúdo não pontuam." Usar framework ou biblioteca faz o requisito web **zerar**. Veja a seção 3.

**Uso de IA:** é permitido como apoio, mas é proibido entregar código sem entender e sem revisar, e o uso precisa ser declarado no README (seção 14).

O objetivo do grupo é **ficar em 1º lugar**. A web precisa ser a mais bonita, clara e bem acabada da turma, sem quebrar nenhuma regra.

---

## 2. O problema e a solução

### O problema
- Em junho de 2026, **430.223 pessoas** esperavam uma consulta com especialista na cidade de São Paulo, e 119 delas esperavam havia 5 anos. Fonte: Poder360, com dados da Secretaria Municipal da Saúde obtidos via LAI. https://www.poder360.com.br/opiniao/fila-por-especialista-em-sao-paulo-tem-espera-de-ate-5-anos/
- Ao mesmo tempo, a taxa média de faltas em consultas do SUS é de **cerca de 25%**. Fonte: Revista de Medicina de Ribeirão Preto (USP). https://revistas.usp.br/rmrp/article/download/159626/154332/356524
- Os principais motivos de falta são esquecimento e falta de transporte.
- Resultado: quem precisa espera anos, enquanto uma em cada quatro vagas fica vazia. Quando alguém cancela em cima da hora ou falta, a vaga simplesmente se perde, porque ninguém da fila fica sabendo dela.

### A solução: Encaixe
Um sistema para a recepção da UBS que:
1. **Confirma antes:** toda consulta precisa ser confirmada até a véspera. Se não for, aparece como "Não confirmada".
2. **Reaproveita a vaga:** quando uma consulta é cancelada, o sistema monta na hora a lista de pacientes da fila que podem ser encaixados, ordenada por regras claras (seção 6).
3. **Dá voz ao cidadão:** a página "Minha consulta" deixa o paciente confirmar ou cancelar pelo celular, só com o cartão SUS. Quem não tem internet resolve por telefone com a recepção, que usa o mesmo sistema.
4. **Mostra por que as pessoas faltam:** a recepção registra o motivo de cada falta, e os relatórios mostram os padrões por UBS.

Já existe evidência de que funciona: numa UBS da Zona Sul de SP, juntar a confirmação com a reposição das vagas teve alto impacto com baixo custo, e o modelo foi replicado em outras UBS. Fonte: CEJAM. https://evento.cejam.org.br/index.php/AECC/article/view/990/964

**ODS:** 3 (Saúde e bem-estar) e 10 (Redução das desigualdades, porque a regra prioriza quem é mais vulnerável).

**Proteção de dados:** o sistema guarda só a agenda (quem, quando, qual especialidade e a classificação de risco). **Nunca** guarda diagnóstico. Isso atende o critério de proteger os dados do cidadão.

---

## 3. Restrições técnicas (obrigatórias)

- **Só HTML5, CSS3 e JavaScript puro.** Nada de React, Vue, Tailwind, Bootstrap, jQuery, GSAP, Chart.js, bibliotecas de ícones, CDNs, npm ou build.
- **Única exceção:** a fonte do Google Fonts (seção 9), carregada por `<link>` e com fallback. É só uma fonte, não uma biblioteca. A página precisa continuar bonita sem ela.
- **Tudo tem que funcionar abrindo o arquivo direto no navegador (`file://`).** Isso traz três consequências:
  - **Não use `<script type="module">`, `import` nem `export`.** O Chrome bloqueia módulos em `file://`. Use scripts clássicos com `defer` e compartilhe o código por um objeto global: `window.Encaixe = window.Encaixe || {}`.
  - **Não use `fetch` em arquivos `.json` locais.** Os dados de exemplo ficam num arquivo `.js`.
  - **Não use sprite SVG externo (`<use href="icones.svg#x">`).** Os ícones são SVG inline gerados por funções JS (seção 9).
- **Nunca use `alert()`, `confirm()` nem `prompt()`.** Use mensagens na página e o elemento nativo `<dialog>`.
- Os dados ficam no `localStorage` no "modo local". A camada de dados (seção 7) já vem pronta pra trocar pelo backend Java depois.

---

## 4. Estrutura de arquivos

Tudo da web fica em `web/`. O Java, o banco e os diagramas entram depois, em outras pastas.

```
encaixe/
├── CLAUDE.md
├── README.md
├── docs/
│   └── web-explicado.md        ← explicação da web pra banca (seção 14)
└── web/
    ├── index.html               ← Início (apresentação do problema e da solução)
    ├── painel.html              ← Painel da recepção
    ├── agenda.html              ← Agenda do dia + encaixe (tela principal)
    ├── fila.html                ← Fila de espera (CRUD)
    ├── pacientes.html           ← Pacientes (CRUD)
    ├── relatorios.html          ← Relatórios
    ├── minha-consulta.html      ← Página do cidadão
    ├── css/
    │   └── style.css            ← um único CSS, organizado por seções comentadas
    └── js/
        ├── dados-exemplo.js     ← dados de demonstração (seção 13)
        ├── api.js               ← camada de dados: modo local e modo servidor (seção 7)
        ├── regras.js            ← regras de negócio (seção 6)
        ├── validacao.js         ← validadores (CPF, cartão SUS, telefone...)
        ├── ui.js                ← componentes comuns: menu mobile, toasts, dialog, ícones, formatação
        └── paginas/
            ├── inicio.js
            ├── painel.js
            ├── agenda.js
            ├── fila.js
            ├── pacientes.js
            ├── relatorios.js
            └── minha-consulta.js
```

- O **cabeçalho, o menu e o rodapé ficam escritos em HTML estático em cada página.** Não injete com JS. Assim o HTML semântico aparece no código-fonte e o menu funciona mesmo sem JS. Marque a página atual com `aria-current="page"`.
- Ordem dos scripts em cada página: `dados-exemplo.js`, `validacao.js`, `regras.js`, `api.js`, `ui.js` e por último o JS da página, todos com `defer`.

---

## 5. Modelo de dados (contrato com o backend Java)

Estes nomes e campos são o contrato entre o front, o Java e o banco. **Não renomeie.** Os IDs são números inteiros, e as datas usam formato ISO (`"2026-11-10"` e `"2026-11-10T09:20:00"`, hora local).

### Paciente
| Campo | Tipo | Regras |
|---|---|---|
| `id` | inteiro | gerado |
| `nome` | texto | obrigatório, de 3 a 100 caracteres, só letras e espaços |
| `cpf` | texto (11 dígitos) | obrigatório, **único**, dígitos verificadores válidos |
| `cartaoSus` | texto (15 dígitos) | obrigatório, **único** |
| `dataNascimento` | data | obrigatória, não pode estar no futuro, idade até 120 anos |
| `telefone` | texto (10 ou 11 dígitos) | obrigatório |
| `bairro` | texto | obrigatório |
| `contatoPreferido` | `"TELEFONE"`, `"WHATSAPP"` ou `"SMS"` | obrigatório |
| `aceitaEncaixe` | booleano | "Pode ir a uma consulta marcada em cima da hora?" |
| `gestante` | booleano | |
| `pcd` | booleano | pessoa com deficiência |

### Profissional
`id`, `nome`, `registro` (texto **único**, ex.: `"CRM-SP 100001"`), `especialidadeId`.

### Ubs
`id`, `nome`, `bairro`, `endereco`.

### Especialidade
`id`, `nome`.

### ProfissionalUbs: relação N:N com tabela associativa
`profissionalId`, `ubsId`, `diaSemana` (de 1 = segunda a 5 = sexta). Um profissional atende em várias UBS em dias diferentes.

### Consulta
| Campo | Tipo | Regras |
|---|---|---|
| `id` | inteiro | gerado |
| `pacienteId` | inteiro | obrigatório |
| `profissionalId` | inteiro | obrigatório |
| `ubsId` | inteiro | obrigatório |
| `especialidadeId` | inteiro | igual à do profissional |
| `dataHora` | data e hora | horários de 20 em 20 minutos, entre 07:00 e 17:00 |
| `status` | `"AGENDADA"`, `"CONFIRMADA"`, `"CANCELADA"`, `"FALTA"` ou `"REALIZADA"` | |
| `origem` | `"NORMAL"` ou `"ENCAIXE"` | |
| `motivoFalta` | `"ESQUECIMENTO"`, `"TRANSPORTE"`, `"TRABALHO"`, `"SAUDE"`, `"OUTRO"` ou `null` | obrigatório quando o status é `FALTA` |

"Não confirmada" **não é um status gravado**. É calculado pela regra da seção 6.

### FilaEspera
| Campo | Tipo | Regras |
|---|---|---|
| `id` | inteiro | gerado |
| `pacienteId` | inteiro | obrigatório |
| `especialidadeId` | inteiro | obrigatório |
| `ubsId` | inteiro | obrigatório |
| `dataEntrada` | data | obrigatória, não pode estar no futuro |
| `classificacaoRisco` | `"ALTA"`, `"MEDIA"` ou `"BAIXA"` | definida pelo médico que encaminhou |
| `status` | `"AGUARDANDO"`, `"ENCAIXADO"` ou `"REMOVIDO"` | |
| `dataSaida` | data ou `null` | preenchida ao sair da fila |

Um paciente não pode estar duas vezes na fila da mesma especialidade com status `AGUARDANDO`.

---

## 6. Regras de negócio (em `js/regras.js`)

No sistema final, essas regras vão morar na camada service do Java. A cópia em JS existe pro modo local funcionar e precisa seguir **exatamente** a mesma lógica. Escreva cada regra como uma função pequena, pura e comentada.

1. **`temPrioridadeLegal(paciente)`**: retorna verdadeiro se o paciente tem 60 anos ou mais, ou é gestante, ou é PcD.
2. **`estaNaoConfirmada(consulta, agora)`**: retorna verdadeiro se o status é `AGENDADA`, a consulta ainda não passou e faltam 24 horas ou menos pra ela.
3. **`listarCandidatosEncaixe(vaga, fila, pacientes, consultas)`**: a vaga é uma consulta `CANCELADA` que ainda não passou.
   - **Quem entra:** registros da fila com status `AGUARDANDO`, da **mesma especialidade e da mesma UBS** da vaga, cujo paciente tem `aceitaEncaixe = true` e não tem outra consulta `AGENDADA` ou `CONFIRMADA` no mesmo horário.
   - **Ordem, critério por critério:**
     1. Classificação de risco: `ALTA` antes de `MEDIA`, que vem antes de `BAIXA`
     2. Prioridade legal: quem tem vem antes
     3. Mora no mesmo bairro da UBS: quem mora vem antes
     4. Data de entrada na fila: quem entrou primeiro vem antes
   - Cada candidato volta com a lista de **motivos** da posição, que a tela mostra como etiquetas. Exemplo: `["Risco alto", "68 anos", "14 meses na fila", "Mora no bairro da UBS"]`.
4. **`encaixar(vagaId, filaId)`**: cria uma consulta nova pro paciente da fila, no mesmo horário, profissional e UBS da vaga, com `status: "CONFIRMADA"` e `origem: "ENCAIXE"`. O registro da fila vira `ENCAIXADO`, com `dataSaida` igual a hoje. A consulta cancelada fica como está, pro histórico.
5. **Validações de agendamento** (devolvem uma mensagem de erro clara):
   - Não agendar no passado.
   - O profissional precisa atender naquela UBS naquele dia da semana (ProfissionalUbs).
   - O profissional não pode ter duas consultas ativas no mesmo horário, e o paciente também não.
6. **Excluir paciente:** bloquear se ele tiver consultas futuras ativas ou estiver na fila aguardando, com a mensagem: "Este paciente tem 2 consultas futuras. Cancele as consultas antes de excluir." Isso imita a chave estrangeira do banco.

---

## 7. Camada de dados (`js/api.js`)

As páginas **nunca** acessam o `localStorage` direto: elas só chamam a `Encaixe.api`. Assim, ligar no Java depois exige mudar só este arquivo.

```js
Encaixe.config = {
  modo: 'local',                         // 'local' (localStorage) ou 'servidor' (Java)
  urlServidor: 'http://localhost:8080/api'
};
```

- **Toda função retorna uma Promise**, mesmo no modo local. Assim, trocar pelo `fetch` não muda nada nas páginas.
- **Modo local:** lê e grava em `localStorage` na chave `"encaixe-db-v1"`. Se a chave não existir, carrega os dados de `dados-exemplo.js`.
- **Erros** são lançados como `Error` com uma mensagem amigável, que a página mostra.
- **Funções:**
  - `pacientes`, `fila` e `consultas` têm `listar`, `buscar(id)`, `criar(dados)`, `atualizar(id, dados)` e `excluir(id)`
  - `consultas` tem também `confirmar(id)`, `cancelar(id)`, `registrarFalta(id, motivo)` e `registrarRealizada(id)`
  - `ubs`, `especialidades` e `profissionais` têm `listar`
  - `encaixe.candidatos(consultaId)` e `encaixe.confirmar(consultaId, filaId)`
  - `relatorios.faltasPorUbs()`, `faltasPorEspecialidade()`, `motivosFalta()`, `reaproveitamento()` e `filaPorEspecialidade()`
  - `consultas.buscarPorCartaoSus(cartaoSus)`, pra página do cidadão
  - `restaurarDadosExemplo()`
- **Modo servidor:** deixe implementado com `fetch`, seguindo este contrato REST, que eu passo pro integrante do Java:
  - `GET /api/pacientes`, `GET /api/pacientes/{id}`, `POST /api/pacientes`, `PUT /api/pacientes/{id}` e `DELETE /api/pacientes/{id}`. O mesmo padrão vale pra `/api/fila` e `/api/consultas`
  - `POST /api/consultas/{id}/confirmar`, `/cancelar`, `/falta` (corpo: `{"motivo": "TRANSPORTE"}`) e `/realizada`
  - `GET /api/consultas?cartaoSus=...`
  - `GET /api/ubs`, `GET /api/especialidades` e `GET /api/profissionais`
  - `GET /api/encaixe/candidatos?consultaId=...` e `POST /api/encaixe` (corpo: `{"consultaId": 1, "filaId": 2}`)
  - `GET /api/relatorios/faltas-por-ubs`, `/faltas-por-especialidade`, `/motivos-falta`, `/reaproveitamento` e `/fila-por-especialidade`
  - O JSON usa os mesmos campos da seção 5. Em caso de erro, o servidor devolve HTTP 400 com `{"erro": "mensagem"}`, e o front mostra essa mensagem.
  - No `docs/web-explicado.md`, anote que o Java vai precisar mandar o cabeçalho `Access-Control-Allow-Origin: *`, porque a página abre via `file://`.

---

## 8. As páginas

Todas têm o mesmo cabeçalho e o mesmo menu: **Início, Painel, Agenda, Fila, Pacientes, Relatórios** e, separado à direita como botão de destaque, **Minha consulta**. O rodapé de todas mostra "Projeto acadêmico da Global Solution FIAP 2026/2. Dados fictícios para demonstração.", um link "Restaurar dados de demonstração" (com confirmação num `<dialog>`) e o espaço pros nomes do grupo.

### `index.html`: Início
É a primeira página que os professores abrem, então ela precisa contar a história em poucos segundos.
- **Hero:** à esquerda, o título "Quando alguém falta, outra pessoa é atendida.", duas linhas explicando o Encaixe e dois botões, "Abrir a agenda" e "Confirmar minha consulta". À direita fica a **demonstração animada** (seção 9): uma folha de agenda de verdade, onde um horário cancelado é reaproveitado.
- **O problema:** os dados da seção 2 escritos como frases, cada um com o link da fonte. Não use cards com número gigante.
- **Como funciona:** três passos, e aqui a numeração faz sentido porque é uma sequência de verdade: confirmar até a véspera, liberar a vaga quando alguém cancela e encaixar quem está na fila.
- **Quem participa:** o paciente, a recepção da UBS e a Secretaria de Saúde, com uma frase sobre o papel de cada um.
- **Impacto:** os ODS 3 e 10 e como o impacto é medido (vagas salvas, taxa de falta, espera).

### `painel.html`: Painel da recepção
- Uma faixa com os números do dia: consultas hoje, confirmadas, não confirmadas, vagas livres pra encaixar e vagas salvas no mês. Dê mais destaque visual às não confirmadas e às vagas livres, que são o que pede ação. Evite cinco cards iguais.
- **"Precisa de atenção":** a lista de consultas não confirmadas (com os botões "Confirmar" e "Cancelar consulta") e de vagas livres (com o botão "Encaixar", que leva pra agenda com a vaga selecionada via `agenda.html?vaga=ID`).
- **"Últimos encaixes":** os 5 encaixes mais recentes, com o tempo que cada paciente esperou.

### `agenda.html`: Agenda e encaixe (a tela principal)
- **Filtros:** UBS, especialidade e dia (com setas de dia anterior e próximo e o botão "Hoje"), mais o botão "Agendar consulta", que abre um formulário num `<dialog>`.
- **A folha do dia:** uma linha por horário de 20 minutos, como uma agenda de papel. Cada linha mostra o horário, o paciente, o profissional, o status (seção 9) e as ações possíveis:
  - **Agendada ou não confirmada:** "Confirmar" e "Cancelar consulta"
  - **Confirmada:** "Registrar presença", "Registrar falta" (abre a escolha do motivo) e "Cancelar consulta"
  - **Cancelada e ainda não passou:** a linha vira **"Vaga livre"**, com o botão "Encaixar"
  - **Encaixe:** a linha recebe o destaque de marca-texto (seção 9)
- **O painel de encaixe:** no desktop, abre uma coluna à direita; no celular, abre um `<dialog>` que sobe de baixo. Ele mostra os até 5 melhores candidatos em ordem, cada um com nome, idade, há quanto tempo está na fila e as **etiquetas de motivo**. O botão "Oferecer vaga" mostra o contato preferido e o telefone, com três respostas:
  - **"Aceitou":** encaixa, anima a linha da agenda (seção 9) e mostra o toast "Maria Aparecida foi encaixada. Ela esperava havia 14 meses."
  - **"Recusou" e "Não atendeu":** passa pro próximo candidato
- Se não houver candidatos, mostre: "Ninguém na fila de Ortopedia desta UBS aceita encaixe agora. A vaga continua livre."

### `fila.html`: Fila de espera (CRUD)
- Formulário pra adicionar à fila: paciente (com busca por nome ou CPF), especialidade, UBS, data de entrada e classificação de risco.
- A lista já vem **na mesma ordem da regra de encaixe**, com filtros por especialidade e UBS, e mostra o tempo de espera em meses e dias. As ações são editar e remover da fila (que muda o status pra `REMOVIDO`, com confirmação).

### `pacientes.html`: Pacientes (CRUD completo)
- O formulário tem todos os campos da seção 5, agrupados em `<fieldset>`: dados pessoais, contato e "Prioridade e encaixe". CPF, cartão SUS e telefone têm máscara de digitação.
- A tabela tem busca por nome, CPF ou cartão SUS, e os botões "Editar" (que preenche o formulário) e "Excluir" (com confirmação num `<dialog>` e a regra 6 da seção 6).
- Esta página é o **modelo de qualidade** pras outras.

### `relatorios.html`: Relatórios
- Filtro de período: últimos 30, 60 ou 90 dias.
- Cinco gráficos de barras horizontais, feitos **só com CSS**:
  - Taxa de faltas por UBS
  - Taxa de faltas por especialidade
  - Motivos de falta
  - Reaproveitamento (vagas liberadas e vagas reocupadas por encaixe)
  - Fila por especialidade (quantidade de pacientes e espera média)
- Cada gráfico tem uma frase de conclusão, gerada a partir dos dados. Exemplo: "Transporte explica 4 em cada 10 faltas na UBS Jardim das Flores."
- Em cada gráfico, uma nota discreta: "No sistema final, este relatório vem de uma consulta SQL com JOIN e GROUP BY."

### `minha-consulta.html`: Página do cidadão
- Pensada primeiro pro celular e pra pessoa idosa: letra grande, botões grandes e um passo de cada vez.
- A pessoa digita o cartão SUS (com máscara `000 0000 0000 0000`) e vê a próxima consulta: dia, hora, UBS, endereço e especialidade. Os botões são "Confirmar consulta" e "Não vou poder ir".
- Embaixo do botão de cancelar, o texto: "Se você não puder ir, cancele aqui. Sua vaga vai para alguém que está esperando na fila."
- Depois de confirmar: "Consulta confirmada. Te esperamos na UBS Jardim das Flores, terça-feira, 10 de novembro, às 9h20."
- Uma nota de teste: "Para testar, use o cartão 898 0012 3456 7890."

---

## 9. Direção de design

### Conceito: a agenda da recepção
O design nasce do balcão da UBS: a **agenda de papel** com uma linha por horário, a **caneta azul** da recepcionista e o **marca-texto** que ela usa pra marcar um encaixe. A interface é limpa e confiável como um formulário bem impresso, e o marca-texto é o único elemento ousado. Ele aparece **só** quando uma vaga é salva, e é a assinatura visual do produto.

Não use logotipo nem identidade visual do SUS, da Prefeitura ou do gov.br. O Encaixe tem identidade própria.

### Cores (variáveis CSS em `:root`)
| Variável | Hex | Uso |
|---|---|---|
| `--papel` | `#F2F5F8` | fundo geral, um branco frio de formulário |
| `--folha` | `#FFFFFF` | superfícies: agenda, formulários, tabelas |
| `--tinta` | `#18233F` | texto principal (azul-caneta escuro) |
| `--caneta` | `#2343B0` | ações principais, links e foco |
| `--marca-texto` | `#EEF35A` | **só para encaixes e vagas salvas**, sempre com texto em `--tinta` |
| `--caneta-vermelha` | `#B3261E` | falta, não confirmada e erros |
| `--verde-confirmado` | `#1F6F4A` | confirmada e realizada |
| `--grafite` | `#5B6478` | texto secundário |
| `--pauta` | `#D5DEEA` | linhas da agenda e bordas |

Todas essas combinações passam no contraste WCAG AA. Não invente cores novas: se precisar de um fundo suave pra um status, use uma versão bem clara da cor do próprio status (veja a tabela de status abaixo).

### Tipografia
- **Uma família só: Atkinson Hyperlegible** (Google Fonts, pesos 400 e 700, com itálico). Ela foi criada pelo Braille Institute pra máxima legibilidade em baixa visão, o que combina com o público idoso. Isso vira até argumento no pitch.
- Fallback: `system-ui, -apple-system, "Segoe UI", sans-serif`.
- A hierarquia vem de tamanho e peso, com uma escala modular de razão 1.25 e corpo de 17px no desktop e 16px no celular. Use `clamp()` nos títulos.
- Os títulos são grandes e com tracking levemente negativo (`-0.01em`). O texto corrido tem `line-height` 1.55 e linhas de no máximo 70 caracteres.
- Horários e números usam `font-variant-numeric: tabular-nums`, pra ficarem alinhados na agenda.

### Layout
- O conteúdo fica alinhado à esquerda, com largura máxima de 1200px e grid de 12 colunas no desktop.
- Os espaçamentos seguem uma escala de 4px (`--esp-1` = 4px até `--esp-10` = 64px).
- Os cantos têm hierarquia, não um raio único: 6px em campos e botões, 12px em painéis e na folha da agenda, e formato de pílula só nas etiquetas.
- **Sombras quase não existem:** a separação vem de bordas em `--pauta`. Só o painel de encaixe e os `<dialog>` têm sombra real, porque estão "acima" da página.

Wireframe do Início no desktop:
```
┌───────────────────────────────────────────────────────────────────────────────┐
│ [▣ Encaixe]   Início  Painel  Agenda  Fila  Pacientes  Relatórios [Minha consulta]│
├───────────────────────────────────────────────────────────────────────────────┤
│                                          ┌─────────────────────────────────┐  │
│  Quando alguém falta,                    │ Terça-feira, 10 de novembro     │  │
│  outra pessoa é atendida.                │ UBS Jardim das Flores, Ortopedia│  │
│                                          ├─────────────────────────────────┤  │
│  O Encaixe confirma as consultas e,      │ 08:40  José Carlos   Confirmada │  │
│  quando alguém cancela, oferece a vaga   │ 09:00  Ana Paula     Confirmada │  │
│  para quem mais precisa na fila.         │ 09:20  Carlos H.     Cancelada  │  │
│                                          │        ▼ (animação)             │  │
│  [Abrir a agenda]  [Confirmar consulta]  │ 09:20 ▓Maria Aparecida  Encaixe▓│  │
│                                          │ 09:40  Rosângela     Agendada   │  │
│                                          └─────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

Wireframe da Agenda no desktop (no celular, o painel vira um `<dialog>` que sobe de baixo):
```
┌ Agenda ───────────────────────────────────────────────────────────────────────┐
│ [UBS ▾] [Especialidade ▾]  [‹] terça, 10/11 [›] [Hoje]      [Agendar consulta] │
├───────────────────────────────────────────────┬───────────────────────────────┤
│ 08:40 │ José Carlos    Dr. Paulo │ Confirmada │ Encaixe para 09:20            │
│ 09:00 │ Ana Paula      Dr. Paulo │ Não conf.  │                               │
│ 09:20 │ ┄┄┄┄┄ Vaga livre ┄┄┄┄┄┄┄ │ [Encaixar] │ 1  Maria Aparecida, 68 anos   │
│ 09:40 │ Rosângela      Dr. Paulo │ Agendada   │    (Risco alto) (60+)         │
│ 10:00 │ ▓ Pedro Alves ▓ Dr. Paulo│ Encaixe    │    (14 meses na fila) (Bairro)│
│       │                          │            │    [Oferecer vaga]            │
│       │                          │            │ 2  João Batista, 41 anos ...  │
└───────────────────────────────────────────────┴───────────────────────────────┘
```

### Status (sempre com cor, ícone e texto, nunca só cor)
| Status | Texto | Cor do texto | Fundo |
|---|---|---|---|
| AGENDADA | Agendada | `--tinta` | `#E8EDF6` |
| (calculado) | Não confirmada | `--caneta-vermelha` | `#FBE9E7` |
| CONFIRMADA | Confirmada | `--verde-confirmado` | `#E3F1EA` |
| FALTA | Faltou | `--caneta-vermelha` | `#FBE9E7` |
| REALIZADA | Atendida | `--grafite` | `#ECEFF3` |
| CANCELADA | a linha vira "Vaga livre" | `--grafite` | borda tracejada em `--pauta` |
| origem ENCAIXE | Encaixe | `--tinta` | `--marca-texto` |

### O marca-texto (a assinatura)
- A linha encaixada recebe um fundo `--marca-texto` com a forma de um traço de marca-texto de verdade: bordas levemente irregulares, feitas com `border-radius` assimétrico e uma leve inclinação num pseudo-elemento `::before` atrás do texto.
- **A animação de encaixe:** o traço "passa" da esquerda pra direita em cerca de 600ms (`clip-path` ou `scaleX` com `transform-origin: left`), enquanto o texto troca de "Vaga livre" pro nome do paciente.
- Essa **mesma animação** aparece em dois lugares: uma vez no hero do Início, quando a página carrega (depois de 1,2s, sem repetir), e na agenda, sempre que a recepção confirma um encaixe. É o único movimento automático do site.
- Com `prefers-reduced-motion: reduce`, o traço aparece direto, sem animação.

### Movimento
- Fora o marca-texto, não use animação de entrada nas seções, nada de fade-and-slide em cada bloco.
- Microinterações só como resposta a uma ação: abrir o `<dialog>`, o toast aparecer, um campo com erro. Tudo curto, entre 150 e 250ms.

### Componentes
- **Botões:** o primário tem fundo `--caneta` e texto branco; o secundário tem borda `--caneta` e texto `--caneta`; o perigoso tem texto `--caneta-vermelha`. Altura mínima de 44px. O texto do botão diz exatamente o que acontece ("Salvar paciente", "Cancelar consulta", "Oferecer vaga"). Nunca coloque seta "→" no texto.
- **Campos:** `<label>` sempre visível acima do campo, nunca só placeholder. Com erro, a borda fica `--caneta-vermelha` e a mensagem aparece logo abaixo, ligada ao campo por `aria-describedby`, com `aria-invalid="true"`.
- **Tabelas:** têm `<caption>` e `<th scope>`. Abaixo de 720px, viram cartões empilhados com o rótulo de cada dado (técnica do `data-label`).
- **Toasts:** ficam numa região com `role="status"` e `aria-live="polite"`, no canto inferior, e somem em 5s. A mensagem repete o verbo do botão: "Salvar paciente" gera "Paciente salvo."
- **Dialog:** use o `<dialog>` nativo com `showModal()`, foco no primeiro campo e fechamento com Esc.
- **Ícones:** um conjunto pequeno de SVG inline, com traço de 1.75px, 20px e cantos arredondados: relógio, check, x, calendário, pessoa, fila, gráfico, telefone, seta pra esquerda e pra direita, mais e lixeira. Gere cada um com uma função em `ui.js`, tipo `Encaixe.icone('relogio')`. Ícone decorativo leva `aria-hidden="true"`.
- **Logo:** um símbolo simples em SVG, um quadrado arredondado com uma "vaga" (um retângulo) sendo preenchida por um traço de marca-texto, ao lado da palavra "Encaixe" em Atkinson Bold.

### O que evitar (é o que faz um site parecer genérico ou feito por IA)
- Fundo quase preto com um único acento verde-limão. O marca-texto é sobre fundo claro.
- Fundo creme com um acento terracota.
- Todo o conteúdo picado em cards idênticos, com a mesma sombra cinza e o mesmo raio.
- Gradientes decorativos.
- Rótulos em CAIXA ALTA com espaçamento largo acima dos títulos.
- Destacar uma única palavra do título com outra cor ou com itálico.
- Textos com pontos no meio ("A · B · C") e fonte monoespaçada em rótulos.
- Numeração (01, 02, 03) em algo que não é sequência.
- Emojis na interface.

Antes de escrever o CSS, revise este plano. Se alguma decisão sua parecer o padrão que você faria pra qualquer site parecido, troque por uma escolha específica deste projeto e me diga o que mudou.

---

## 10. Texto da interface

- Português simples, frases curtas, voz ativa e só a primeira letra maiúscula.
- Fale como a recepção e o paciente falam: "Vaga livre", "Não confirmada", "Faltou", "Encaixar". Não use termos de sistema, tipo "registro", "entidade" ou "submit".
- Uma ação tem o mesmo nome no fluxo inteiro: o botão "Encaixar" leva ao painel "Encaixe para 09:20" e termina no toast "... foi encaixada".
- Mensagens de erro dizem o que aconteceu e como resolver, sem pedir desculpa. Exemplos:
  - "CPF inválido. Confira os 11 números."
  - "Este CPF já está cadastrado para Ana Paula Ribeiro."
  - "Dr. Paulo Menezes não atende na UBS Vila Nova às sextas."
  - "Escolha um horário a partir de agora."
- Telas vazias convidam a agir: "Nenhum paciente cadastrado ainda. Comece pelo formulário acima."
- Datas por extenso em pt-BR ("terça-feira, 10 de novembro, às 9h20"), usando `Intl.DateTimeFormat('pt-BR')`.

---

## 11. Validação (em `js/validacao.js`)

- Os formulários usam `novalidate`, e a validação é toda em JS, com mensagens na página.
- **CPF:** 11 dígitos, sem todos iguais, com os dois dígitos verificadores calculados pelo algoritmo oficial.
- **Cartão SUS:** 15 dígitos, começando por 1, 2, 7, 8 ou 9.
- **Telefone:** 10 ou 11 dígitos, com máscara `(11) 91234-5678`.
- **Nome:** de 3 a 100 caracteres, só letras (com acento) e espaços.
- **Datas:** nascimento não pode estar no futuro e a idade vai até 120 anos; a entrada na fila não pode estar no futuro; o agendamento tem que ser no futuro, de 20 em 20 minutos.
- **Unicidade:** CPF e cartão SUS são checados no salvar, inclusive na edição, ignorando o próprio registro.
- Valide no envio e, depois do primeiro erro, também no `blur` de cada campo. Ao enviar com erro, mova o foco pro primeiro campo inválido.

---

## 12. Qualidade mínima: acessibilidade e responsividade

- `lang="pt-BR"`, um `<h1>` por página, hierarquia de títulos correta e o link "Pular para o conteúdo" no topo.
- Landmarks: `<header>`, `<nav aria-label="Principal">`, `<main id="conteudo">` e `<footer>`.
- Foco visível em tudo: `outline` de 3px em `--caneta`, com 2px de offset. Nunca remova o outline sem pôr algo no lugar.
- Tudo funciona pelo teclado, inclusive o painel de encaixe e os dialogs.
- **Mobile first.** Breakpoints em 720px e 1024px. Abaixo de 720px, o menu vira um botão "Menu" com `aria-expanded`, e as tabelas viram cartões.
- Teste mentalmente (e me diga como testar) em 375px, 768px e 1280px de largura.
- Áreas de toque de pelo menos 44 por 44 px.
- Contraste AA em todos os textos. As cores da seção 9 já passam: não clareie o texto secundário.
- `prefers-reduced-motion` é respeitado.

---

## 13. Dados de demonstração (`js/dados-exemplo.js`)

As **datas são relativas a hoje**, calculadas com `new Date()` quando os dados carregam. Assim, a demo funciona em qualquer dia, inclusive no dia da gravação do pitch. Todos os nomes, CPFs e cartões são fictícios.

- **3 UBS fictícias:** UBS Jardim das Flores (Itaquera), UBS Vila Nova (Guaianases) e UBS Parque do Carmo (São Mateus), com endereços fictícios.
- **6 especialidades:** Ortopedia, Cardiologia, Oftalmologia, Dermatologia, Neurologia e Endocrinologia.
- **8 profissionais**, com registros fictícios do tipo `CRM-SP 100001`, distribuídos em ProfissionalUbs de forma que cada UBS tenha atendimento de Ortopedia em pelo menos dois dias da semana.
- **24 pacientes** com idades, bairros e flags variados. Os CPFs são gerados válidos por uma função que calcula os dígitos verificadores. Os bairros são Itaquera, Guaianases, São Mateus, Cidade Tiradentes, José Bonifácio e Artur Alvim.
- **Consultas:**
  - **Nos últimos 90 dias:** cerca de 120 consultas, com aproximadamente 25% de faltas, refletindo o dado real. Os motivos se distribuem em mais ou menos 35% esquecimento, 30% transporte, 20% trabalho, 10% saúde e 5% outro. Faça transporte pesar mais na UBS Parque do Carmo, pra os relatórios terem uma conclusão interessante. Inclua também algumas canceladas e cerca de 10 de origem `ENCAIXE`.
  - **Hoje e amanhã:** uma agenda cheia de Ortopedia na UBS Jardim das Flores, com uma mistura de confirmadas e agendadas.
- **Fila:** 20 registros espalhados pelas especialidades e UBS.

**O cenário do pitch.** É obrigatório, porque é a história do vídeo:
- **A consulta da demo:** Carlos Henrique Lima, cartão SUS `898001234567890`, tem consulta **amanhã às 9h20** de Ortopedia na UBS Jardim das Flores, com status `AGENDADA` (aparece como "Não confirmada").
- **Maria Aparecida Souza, a estrela:** 68 anos, mora em Itaquera, risco `ALTA`, entrou na fila de Ortopedia da UBS Jardim das Flores **há 14 meses**, aceita encaixe e prefere WhatsApp. Ela tem que ficar em **1º lugar**.
- **Os outros candidatos dessa fila, cada um mostrando uma regra:**
  - João Batista Rocha, 41 anos, risco `ALTA`, mora em Guaianases, há 6 meses. Fica em **2º**, porque tem o mesmo risco, mas não tem prioridade legal.
  - Sebastiana Freitas, 72 anos, risco `MEDIA`, mora em Itaquera, há 20 meses. Fica **abaixo dos dois de risco alto**, mesmo esperando mais: o risco vem primeiro.
  - Luana Martins, 29 anos, gestante, risco `BAIXA`, há 3 meses. Fica por último.
  - Antônio Carlos Dias, risco `ALTA`, **não aceita encaixe**. **Não aparece** na lista, mostrando o filtro.
- **O roteiro da demo:** Carlos entra em "Minha consulta" e clica em "Não vou poder ir". A recepção abre o Painel e vê a vaga livre. Clica em "Encaixar", e a agenda mostra Maria em 1º, com os motivos. A recepção clica em "Oferecer vaga" e depois em "Aceitou". O marca-texto anima, e o Painel mostra uma vaga salva a mais.
- O link "Restaurar dados de demonstração" volta tudo pro estado inicial, pra gravar o vídeo quantas vezes for preciso.

---

## 14. Documentação

- **`README.md` (raiz):** crie as seções Sobre o projeto, Como abrir a web ("abra `web/index.html` no navegador; não precisa instalar nada"), Estrutura de pastas, Modo local e modo servidor, e **Uso de IA**. Deixe um rascunho honesto nessa última, que o grupo vai revisar: "Usamos o Claude (Anthropic) no VS Code para gerar a base da interface web a partir de um briefing escrito pelo grupo. Todo o código foi revisado e estudado pelos integrantes." Deixe também um espaço reservado pras seções do Java e do banco, que entram depois.
- **`docs/web-explicado.md`:** escrito pra eu e o grupo estudarmos antes da banca. Ele deve ter:
  - O papel de cada arquivo, em uma ou duas frases
  - O caminho de um clique: o que acontece no código, passo a passo, quando a recepção clica em "Aceitou"
  - Cada regra de negócio explicada com um exemplo dos dados da demo
  - Como trocar do modo local pro modo servidor
  - **"Perguntas que a banca pode fazer"**: umas 10 perguntas prováveis, com respostas curtas. Exemplos: por que não usaram framework, como a validação de CPF funciona, como garantem o contraste, o que acontece se o paciente não tiver internet.

---

## 15. Fases de execução

Pare no fim de cada fase pro meu ok.

1. **Fundação:** os tokens e a base do `style.css`, o cabeçalho, o menu (com a versão mobile), o rodapé e o `index.html` completo, com a animação do marca-texto no hero. As outras páginas ficam criadas com o mesmo cabeçalho e rodapé e um `<h1>`, pra navegação já funcionar.
2. **Dados e regras:** `dados-exemplo.js` (com o cenário do pitch), `api.js` (os dois modos), `regras.js`, `validacao.js` e `ui.js`. Me mostre como conferir no console do navegador que Maria Aparecida aparece em 1º.
3. **Pacientes:** o CRUD completo, que vira o modelo de qualidade.
4. **Agenda e encaixe:** a tela principal e o momento-chave do pitch.
5. **Fila e Minha consulta.**
6. **Painel e Relatórios.**
7. **Polimento:** revisão de responsividade nos três tamanhos, teclado, contraste, textos (seção 10) e consistência visual. Depois, os docs da seção 14 e o checklist final.

### Checklist final (confira e me mostre o resultado)
- [ ] O `index.html` abre com dois cliques e tudo funciona em `file://`, sem erro no console
- [ ] 7 páginas, com o mesmo menu em todas e HTML semântico
- [ ] CRUD de pacientes e de fila com validação e mensagens na página
- [ ] Agenda com confirmar, cancelar, falta (com motivo), presença e encaixe funcionando
- [ ] O cenário do pitch roda do começo ao fim e o link de restaurar funciona
- [ ] Bonito e usável em 375px, 768px e 1280px
- [ ] Nenhuma biblioteca, framework, CDN ou módulo ES (só o Google Fonts)
- [ ] Nenhum `alert`, `confirm` ou `prompt`
- [ ] Contraste AA, foco visível e `prefers-reduced-motion` respeitado
- [ ] README com a seção de uso de IA e o `docs/web-explicado.md` completo
