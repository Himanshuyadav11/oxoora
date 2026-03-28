param(
  [Parameter(Mandatory = $true)]
  [string]$ImageName,

  [string]$Tag = "latest",

  [string]$Platform = "linux/amd64"
)

$ErrorActionPreference = "Stop"

function Assert-DockerReady {
  cmd /c "docker info >NUL 2>NUL"

  if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not running. Start Docker Desktop first, then run this script again."
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$dockerfile = Join-Path $scriptDir "Dockerfile"
$fullTag = "${ImageName}:${Tag}"

Assert-DockerReady

Write-Host "Building $fullTag ..."
docker build --platform $Platform -f $dockerfile -t $fullTag $repoRoot

if ($Tag -ne "latest") {
  $latestTag = "${ImageName}:latest"
  Write-Host "Tagging $latestTag ..."
  docker tag $fullTag $latestTag
}

Write-Host "Pushing $fullTag ..."
docker push $fullTag

if ($Tag -ne "latest") {
  $latestTag = "${ImageName}:latest"
  Write-Host "Pushing $latestTag ..."
  docker push $latestTag
}

Write-Host "Done."
