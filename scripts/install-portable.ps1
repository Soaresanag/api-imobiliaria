$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot '.local'
$version = '11.4.10'
$archive = Join-Path $localRoot "mariadb-$version-winx64.zip"
$expectedHash = 'fb7c76f0804321ee373daa49145f2056d2d88f321b614130adeb05a1644ea003'
$uri = "https://archive.mariadb.org/mariadb-$version/winx64-packages/mariadb-$version-winx64.zip"
New-Item -ItemType Directory -Path $localRoot -Force | Out-Null
if (-not (Test-Path -LiteralPath $archive) -or (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) {
    # Retoma somente o arquivo parcial pertencente a este projeto.
    if (Test-Path -LiteralPath $archive) {
        & curl.exe -fL -C - --connect-timeout 15 --max-time 180 $uri -o $archive
    } else {
        & curl.exe -fL --connect-timeout 15 --max-time 180 $uri -o $archive
    }
    if ($LASTEXITCODE -ne 0) { throw 'Download incompleto. Execute novamente para retomar.' }
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'SHA-256 diferente do manifesto oficial. Não executar o pacote.'
}
$destination = Join-Path $localRoot "mariadb-$version-winx64"
if (-not (Test-Path -LiteralPath $destination)) {
    Expand-Archive -LiteralPath $archive -DestinationPath $localRoot
}
if (-not (Test-Path -LiteralPath (Join-Path $destination 'bin\mariadbd.exe'))) {
    throw 'Extração incompleta. Não executar; verificar somente a pasta .local deste projeto.'
}
Write-Output "MariaDB $version portátil verificado e extraído dentro de .local. Nenhum serviço registrado."
