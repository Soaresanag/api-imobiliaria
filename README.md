# API REST — Imobiliária

Trabalho acadêmico em Node.js, Express e MySQL/MariaDB, com cadastro, listagem, consulta, atualização e exclusão de imóveis. Ambiente testado: Windows, Node.js 24.21.0, npm 11.19.0 e MariaDB portátil 11.4.10.

## Requisitos

- Windows x64 para os comandos de MariaDB portátil deste README.
- Node.js 22 ou superior, npm e acesso à internet para baixar dependências e o ZIP oficial.
- A API também pode usar MySQL/MariaDB em outro sistema, com banco próprio e `.env` correspondente; o instalador portátil é exclusivo do Windows.
- Postman é opcional: o projeto inclui testes automatizados.

## Estrutura

```text
app.js                       Express e tratamento de erros
server.js                    Inicialização HTTP e verificação da tabela
config/environment.js        Configuração local validada
config/database.js           Pool MySQL/MariaDB
routes/imovelRoutes.js        Cinco rotas REST
database/imobiliaria.sql     Script SQL da entrega
scripts/init-db.js            Execução do SQL e verificação dos campos
scripts/install-portable.ps1 Download oficial, SHA-256 e extração
scripts/portable-db.js        Inicialização, execução e administração do banco próprio
test/                        Testes HTTP e persistência
.local/                      Executáveis, ZIP, dados, configurações e logs (não versionados)
.env                         Credenciais locais (não versionadas)
```

Os comandos devem ser executados na pasta que contém `package.json`. Neste workspace, ela é a subpasta `api-imobiliaria` dentro da pasta de mesmo nome.

## Instalação e credenciais

```powershell
npm ci
```

Em uma cópia nova do repositório, se `.env` ainda não existir:

```powershell
Copy-Item .env.example .env
```

Edite `.env` e substitua as duas senhas de exemplo por senhas distintas e exclusivas. No ambiente entregue localmente, esse arquivo já está preparado com senhas aleatórias; não o sobrescreva.

| Variável | Valor proposto |
| --- | --- |
| HOST | `127.0.0.1` |
| PORT | `3000` |
| DB_HOST | `127.0.0.1` |
| DB_PORT | `13316` |
| DB_NAME | `imobiliaria` |
| DB_USER | `imobiliaria_app` |
| DB_PASSWORD | Senha exclusiva do usuário da API |
| DB_ROOT_PASSWORD | Outra senha, exclusiva de administração do banco portátil |

A configuração é carregada pelo caminho do projeto e os valores de `.env` têm precedência dentro do processo da API. Nenhuma variável global é alterada. A API não usa a senha root. O modo portátil recusa endereço diferente de `127.0.0.1:13316` e banco/usuário diferentes dos nomes acima.

## MariaDB portátil sem Docker ou serviço Windows

O instalador baixa somente o [ZIP oficial MariaDB 11.4.10](https://archive.mariadb.org/mariadb-11.4.10/winx64-packages/mariadb-11.4.10-winx64.zip) e confere o SHA-256 fixado a partir do [manifesto oficial](https://archive.mariadb.org/mariadb-11.4.10/winx64-packages/sha256sums.txt). Não há instalador MSI, criação de serviço, modificação de PATH, firewall ou configurações globais.

Primeiro confira as portas. Se uma estiver ocupada, não interrompa o processo que a utiliza. Para a API, pode-se escolher outra PORT no `.env`; o banco portátil exige a porta 13316.

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000,13316 }
npm run db:portable:install
npm run db:portable:init
```

O instalador retoma downloads parciais e bloqueia execução em caso de hash divergente. A extração fica em `.local/mariadb-11.4.10-winx64`. A inicialização cria os arquivos de sistema em `.local/data`, configurações em `.local/my.ini` e `.local/bootstrap.ini`, temporários em `.local/tmp` e logs em `.local/logs`. Ela se recusa a sobrescrever um diretório de dados existente. Execute `init` somente na primeira instalação.

O inicializador Windows recebe apenas o template local; o processo de bootstrap usa seu `my.ini` específico. O servidor é iniciado com `--defaults-file` apontando para `.local/my.ini`, sem carregar arquivos globais MySQL/MariaDB. O endereço de escuta é somente `127.0.0.1:13316`, com buffer InnoDB de 64 MiB e até 20 conexões. CPU, memória e disco continuam compartilhados com o computador.

Se a política do Windows bloquear o script, ou faltar algum componente do sistema, interrompa e avalie separadamente. Não altere políticas globais nem instale componentes automaticamente.

No **terminal 1**, mantenha o banco executando:

```powershell
npm run db:portable:start
```

No **terminal 2**, prepare o banco, execute o SQL e inicie a API:

```powershell
npm run db:portable:status
npm run db:portable:provision
npm run db:init
npm start
```

`provision` verifica o diretório de dados e o endereço antes de criar banco/usuário. Concede ao usuário da API SELECT, INSERT, UPDATE, DELETE e CREATE somente em `imobiliaria.*`; não concede administração global. `db:init` executa `database/imobiliaria.sql`, com `CREATE DATABASE IF NOT EXISTS` e `CREATE TABLE IF NOT EXISTS`, e verifica os quatro campos. A API confere a tabela antes de abrir a porta HTTP.

API: **http://127.0.0.1:3000**. Para desenvolvimento, `npm run dev` usa o modo `node --watch`, sem pacotes globais.

Nas próximas execuções, basta iniciar o banco e a API; não repetir a inicialização. Alterar as senhas no `.env` não modifica as senhas já armazenadas no banco. Não apagar o diretório de dados para contornar problemas de credenciais.

Para encerrar **somente o banco deste projeto**, em outro terminal:

```powershell
npm run db:portable:stop
```

Esse comando confere `datadir`, endereço e porta antes do encerramento SQL. Para encerrar a API, use Ctrl+C no terminal em que a iniciou. Não usar encerramento por nome de processo, pois isso poderia atingir outro projeto. Nenhum processo é registrado para iniciar automaticamente com o Windows.

`compose.yaml` permanece como alternativa preparada, mas não é utilizado neste procedimento. Nenhum comando Docker é necessário ou executado pelos scripts portáteis.

## Banco e rotas

| Campo | Tipo |
| --- | --- |
| id | INT, chave primária, AUTO_INCREMENT |
| descricao | VARCHAR(255), obrigatório |
| bairro | VARCHAR(100), obrigatório |
| valor | DECIMAL(12,2), obrigatório |

| Método | Caminho | Finalidade |
| --- | --- | --- |
| GET | `/imovel` | Listar todos |
| GET | `/imovel/:id` | Consultar por ID |
| POST | `/imovel` | Cadastrar |
| PUT | `/imovel/:id` | Atualizar os três campos |
| DELETE | `/imovel/:id` | Excluir |

`GET /imovel/` também lista todos. Para consulta individual, atualização e exclusão, a URL precisa conter um ID, por exemplo `/imovel/1`.

Para POST e PUT, envie `Content-Type: application/json`:

```json
{
  "descricao": "Casa com 3 quartos",
  "bairro": "Setor Bueno",
  "valor": 450000.00
}
```

Descrição e bairro devem ser textos não vazios dentro dos limites da tabela. Valor deve estar entre 0 e 9999999999.99, com até duas casas decimais e ponto como separador. ID deve ser inteiro positivo. Consultas usam parâmetros SQL. GET retorna `valor` como string decimal do driver para preservar precisão.

Respostas: `200` para consultas/alterações/exclusões, `201` para cadastro, `400` para dados ou JSON inválidos, `404` para imóvel/rota inexistente, `413` para corpo excessivo e `500` para erro interno. POST e PUT retornam `{ mensagem, imovel }`; DELETE retorna `{ mensagem }`.

## Testes reais

Com o banco e a API executando, no **terminal 3**:

```powershell
npm test
npm run test:validation
```

O CRUD cria apenas seu próprio registro e testa as cinco rotas, atualização repetida, exclusão, inexistência, IDs inválidos, valores inválidos e JSON malformado. Ao finalizar, tenta remover somente o ID que criou. A URL padrão é `http://127.0.0.1:3000`; se PORT mudar, defina TEST_BASE_URL apenas nesse terminal para o endereço da API deste projeto. Nunca aponte esses testes para uma API profissional.

`test:validation` usa um servidor HTTP temporário em porta local aleatória e não consulta o banco.

Para comprovar persistência após reiniciar exclusivamente este banco, mantendo a API ativa:

```powershell
node test/persistence.js create
npm run db:portable:stop
```

Inicie novamente `npm run db:portable:start` no terminal 1 e aguarde o servidor ficar pronto. Depois:

```powershell
node test/persistence.js verify
```

O teste confirma a gravação via SQL independente, recupera os mesmos campos após reiniciar o MariaDB e exclui seu próprio registro. O ID temporário fica em `.local/persistence-test.json`; se a verificação falhar, preserve esse arquivo para investigar.

## Resultado da validação em 15/10/2026

- ZIP oficial baixado, SHA-256 conferido e extraído.
- Banco executado somente em 127.0.0.1:13316, com datadir dentro do projeto.
- Script SQL executado; quatro campos e tipos confirmados no servidor real.
- API iniciada com `npm start`.
- POST, duas formas de listagem GET, GET por ID, PUT e DELETE aprovados.
- Dados inválidos, JSON malformado e respostas 400/404 aprovados.
- Persistência confirmada em conexão SQL independente e após reinício exclusivo do banco.
- Registros de teste excluídos; tabela vazia ao concluir os testes.
- `npm audit`: zero vulnerabilidades reportadas na consulta realizada.
- Nenhum recurso Docker, serviço Windows ou configuração global alterado.

## Publicação no GitHub

`.gitignore` exclui `.local/` por completo, `.env`, variantes de `.env` (exceto `.env.example`), `node_modules/`, cache npm, logs e cobertura. Executáveis, ZIP, banco e senhas locais não devem ser publicados. Versionar código, testes, SQL, README, Compose, `.env.example` sem senhas reais e `package-lock.json`.

Antes de publicar:

```powershell
git check-ignore .env .local/data .local/my.ini .local/mariadb-11.4.10-winx64/bin/mariadbd.exe node_modules .npm-cache
git status --short --untracked-files=all
```

Após revisar, adicionar somente os arquivos da entrega e conferir o conteúdo:

```powershell
git add README.md .gitignore .env.example package.json package-lock.json app.js server.js compose.yaml config routes database scripts test
git diff --cached --stat
git diff --cached
git commit -m "feat: entrega API REST de imobiliaria testada"
```

Configure o remoto do repositório público e faça push quando desejar. Não usar `git add -f` para arquivos ignorados. Nenhuma publicação, criação de remoto ou push foi executado pelo assistente.
