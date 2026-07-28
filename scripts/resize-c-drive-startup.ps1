$ErrorActionPreference = "Stop"

Start-Sleep -Seconds 20

$supportedSize = Get-PartitionSupportedSize -DriveLetter C
Resize-Partition -DriveLetter C -Size $supportedSize.SizeMax

$volume = Get-Volume -DriveLetter C
Write-Host "C_RESIZE_DONE Size=$($volume.Size) Free=$($volume.SizeRemaining)"
