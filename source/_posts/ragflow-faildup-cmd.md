---
title: Fixing a Docker Compose Port Bind Failure in RAGFlow on Windows
date: 2026-05-22 12:30:00
tags:
  - Docker
  - RAGFlow
  - Windows
  - Debugging
categories:
  - Debugging
---

## The Problem

I tried to start RAGFlow with Docker Compose and got this error:

```text
Error response from daemon: ports are not available: exposing port TCP 0.0.0.0:5455 -> 127.0.0.1:0: listen tcp 0.0.0.0:5455: bind: An attempt was made to access a socket in a way forbidden by its access permissions.
```

## What It Actually Meant

This was not a broken `docker-compose.yml` file. The real issue was that Windows had excluded port `5455`, so Docker could not bind MySQL to that host port.

## How To Check Whether a Port Is Really Occupied

```powershell
netstat -ano | Select-String ':5455'
Get-NetTCPConnection -LocalPort 5455 -ErrorAction SilentlyContinue | Format-List *
```

If both commands show nothing, the port may still be blocked by Windows reserved port ranges.

## How To Check Windows Excluded Port Ranges

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

In my case, the output included:

```text
Start Port    End Port
----------    --------
5396          5495
```

That range included `5455`, which explains the Docker bind failure.

## How To Change the Docker Host Port

Open `.env` in the RAGFlow `docker/` directory and change:

```env
EXPOSE_MYSQL_PORT=5455
```

to:

```env
EXPOSE_MYSQL_PORT=5500
```

Then restart:

```powershell
docker compose --profile cpu --profile elasticsearch up -d
```

## Command Summary

```powershell
netstat -ano | Select-String ':5455'
Get-NetTCPConnection -LocalPort 5455 -ErrorAction SilentlyContinue | Format-List *
netsh interface ipv4 show excludedportrange protocol=tcp
docker compose config
docker compose --profile cpu --profile elasticsearch up -d
```

## Takeaway

Next time I see a Docker port bind error on Windows, I should check both:

1. whether another process is already listening on that port
2. whether Windows has excluded the port range even if no process is using it
