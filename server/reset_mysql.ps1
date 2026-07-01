# Verifica se está rodando como Administrador, se não, solicita elevação
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Este script precisa de privilégios de Administrador. Solicitando elevação..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    Exit
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  RECUPERAÇÃO DE SENHA DO MYSQL (ROOT)   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Passo 1: Alterar o caminho do serviço para modo seguro
Write-Host "`n[Passo 1] Alterando o caminho do serviço para modo seguro..." -ForegroundColor Green
$binpathSafe = '"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" --skip-grant-tables MySQL80'
$configResult = sc.exe config MySQL80 binpath= $binpathSafe
Write-Host $configResult

# Passo 2: Iniciar o serviço em modo seguro
Write-Host "`n[Passo 2] Iniciando o serviço MySQL80 em modo seguro..." -ForegroundColor Green
Start-Service MySQL80

Write-Host "Aguardando 5 segundos para o banco de dados inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Passo 3: Resetar a senha do root
Write-Host "`n[Passo 3] Conectando ao MySQL e redefinindo a senha do root..." -ForegroundColor Green
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$sqlCommands = "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';"
& $mysqlPath -u root -e $sqlCommands

# Passo 4: Parar o serviço temporariamente
Write-Host "`n[Passo 4] Parando o serviço MySQL80..." -ForegroundColor Green
Stop-Service MySQL80
Start-Sleep -Seconds 2

# Passo 5: Restaurar o caminho original do serviço
Write-Host "`n[Passo 5] Restaurando o caminho original do serviço..." -ForegroundColor Green
$binpathNormal = '"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" MySQL80'
$configResultNormal = sc.exe config MySQL80 binpath= $binpathNormal
Write-Host $configResultNormal

# Passo 6: Iniciar o serviço definitivo
Write-Host "`n[Passo 6] Iniciando o serviço MySQL80 no modo normal..." -ForegroundColor Green
Start-Service MySQL80

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "PROCESSO CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "A senha do root do MySQL foi alterada para: 123456" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "`nPressione qualquer tecla para fechar esta janela..."
$null = [System.Console]::ReadKey()
