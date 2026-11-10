# Encaixe

**Quando alguém falta, outra pessoa é atendida.**

Projeto da Global Solution FIAP 2026/2, com o tema *CitizenTech: tecnologia com o cidadão no centro*.

---

## Sobre o projeto

### O problema

Em junho de 2026, **430.223 pessoas** esperavam uma consulta com especialista na cidade de São Paulo, e 119 delas esperavam havia cinco anos ([Poder360, com dados da Secretaria Municipal da Saúde obtidos via LAI](https://www.poder360.com.br/opiniao/fila-por-especialista-em-sao-paulo-tem-espera-de-ate-5-anos/)).

Ao mesmo tempo, cerca de **25% das consultas do SUS terminam em falta** ([Revista de Medicina de Ribeirão Preto, USP](https://revistas.usp.br/rmrp/article/download/159626/154332/356524)). Os motivos mais comuns são o esquecimento e a falta de transporte.

Quem precisa espera anos, enquanto uma em cada quatro vagas fica vazia. Quando alguém cancela em cima da hora ou falta, a vaga se perde, porque ninguém da fila fica sabendo dela.

### A solução

O Encaixe é um sistema para a recepção da UBS que:

1. **Confirma antes.** Toda consulta precisa ser confirmada até a véspera. Se não for, aparece como "Não confirmada", e a recepção sabe para quem ligar.
2. **Reaproveita a vaga.** Quando uma consulta é cancelada, o sistema monta na hora a lista de quem pode ser encaixado. A ordem segue regras claras: risco, prioridade legal, bairro e tempo de espera.
3. **Dá voz ao cidadão.** Na página "Minha consulta", o paciente confirma ou cancela pelo celular só com o cartão SUS. Quem não tem internet resolve por telefone com a recepção, que usa o mesmo sistema.
4. **Mostra por que as pessoas faltam.** A recepção registra o motivo de cada falta, e os relatórios mostram os padrões por UBS.

Já existe evidência de que funciona: numa UBS da Zona Sul de São Paulo, juntar a confirmação com a reposição das vagas teve alto impacto com baixo custo ([CEJAM](https://evento.cejam.org.br/index.php/AECC/article/view/990/964)).

**ODS:** 3 (Saúde e bem-estar) e 10 (Redução das desigualdades, porque a regra de encaixe chama primeiro quem é mais vulnerável).

**Proteção de dados:** o sistema guarda só a agenda (quem, quando, qual especialidade e a classificação de risco). Diagnóstico nunca entra no sistema.

---

## Como abrir a web

Abra `web/index.html` no navegador. Não precisa instalar nada.

A web funciona com dois cliques no arquivo, direto do computador (`file://`), no celular e no desktop. Os dados de demonstração carregam sozinhos na primeira vez.

### Roteiro da demonstração

1. Abra **Minha consulta**, digite o cartão `898 0012 3456 7890` e clique em **Não vou poder ir**. Essa é a consulta de Carlos Henrique Lima, amanhã às 9h20.
2. Abra o **Painel**. A vaga das 9h20 aparece em "Vagas livres".
3. Clique em **Encaixar**. A Agenda abre com Maria Aparecida Souza em 1º lugar, junto com os motivos da posição dela.
4. Clique em **Oferecer vaga** e depois em **Aceitou**. A linha recebe o marca-texto, e o Painel passa a mostrar uma vaga salva a mais.

Para repetir a demonstração, use **Restaurar dados de demonstração**, no rodapé de qualquer página. As datas são recalculadas a partir de hoje. Por isso, convém restaurar logo antes de gravar o vídeo.

---

## Estrutura de pastas

```
encaixe/
├── README.md
├── docs/
│   └── web-explicado.md        explicação da web, para estudar antes da banca
└── web/
    ├── index.html              Início: o problema e a solução
    ├── painel.html             Painel da recepção
    ├── agenda.html             Agenda do dia e encaixe (a tela principal)
    ├── fila.html               Fila de espera (CRUD)
    ├── pacientes.html          Pacientes (CRUD)
    ├── relatorios.html         Relatórios
    ├── minha-consulta.html     Página do cidadão
    ├── css/style.css           um único CSS, organizado em seções
    └── js/
        ├── dados-exemplo.js    dados de demonstração, com datas relativas a hoje
        ├── validacao.js        CPF, cartão SUS, telefone, nome e datas
        ├── regras.js           regras de negócio (as mesmas do Java)
        ├── api.js              camada de dados: modo local e modo servidor
        ├── ui.js               menu, toasts, ícones, formatação
        └── paginas/            o JavaScript de cada página
```

A web usa só **HTML5, CSS3 e JavaScript puro**, sem framework, biblioteca, CDN ou etapa de build. A única coisa externa é a fonte Atkinson Hyperlegible, do Google Fonts. Sem internet, a página usa a fonte do sistema.

---

## Modo local e modo servidor

As páginas nunca acessam os dados direto: elas sempre chamam `Encaixe.api`, que fica em `web/js/api.js`. A camada de dados tem dois modos, com as mesmas funções:

| Modo | Onde ficam os dados | Para quê |
|---|---|---|
| `local` (padrão) | `localStorage` do navegador | A demonstração funciona sem servidor |
| `servidor` | Back-end Java, por `fetch` | Ler e gravar no banco de verdade |

Para trocar de modo, mude uma linha no começo de `web/js/api.js`:

```js
Encaixe.config = {
  modo: 'servidor',
  urlServidor: 'http://localhost:8080/api'
};
```

O contrato REST completo e o cabeçalho de CORS que o Java precisa enviar estão em [`docs/web-explicado.md`](docs/web-explicado.md#como-trocar-do-modo-local-para-o-modo-servidor).

---

## Back-end Java

*(seção a ser escrita pelo integrante responsável pelo Java + JDBC)*

## Banco de dados

*(seção a ser escrita pelo integrante responsável pelo banco: diagrama ER e script `.sql`)*

---

## Uso de IA

Usamos o Claude (Anthropic) no VS Code para gerar a base da interface web a partir de um briefing escrito pelo grupo. Todo o código foi revisado e estudado pelos integrantes.

*(Rascunho: o grupo vai revisar este texto antes da entrega.)*

---

## Grupo

- Nome do integrante, RM 000000
- Nome do integrante, RM 000000
- Nome do integrante, RM 000000
