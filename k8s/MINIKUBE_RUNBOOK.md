# Runbook — levantar MindBridge en Minikube (con ArgoCD + imágenes de DockerHub)

Las imágenes (`tcordoba24/mindbridge-backend` y `tcordoba24/mindbridge-frontend`) las construye y sube
GitHub Actions automáticamente en cada push a `gestion`/`main`. Acá **no se buildea nada local** —
ArgoCD las pullea directo de DockerHub.

## 1. Iniciar Minikube
```powershell
minikube start --driver=docker
```

## 2. Crear el namespace y los secrets (manual, una sola vez)

Los secrets NO están en git (gitignored) — hay que crearlos a mano cada vez que se borra el cluster.

```powershell
kubectl create namespace mindbridge

# Postgres
cp k8s/postgres/secret.example.yaml k8s/postgres/secret.yaml
# editar valores si hace falta, luego:
kubectl apply -f k8s/postgres/secret.yaml

# Backend
cp k8s/backend/secret.example.yaml k8s/backend/secret.yaml
# completar NVIDIA_API_KEY, SUPABASE_S3_ACCESS_KEY_ID, SUPABASE_S3_SECRET_ACCESS_KEY
kubectl apply -f k8s/backend/secret.yaml
```

## 3. Instalar ArgoCD

```powershell
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml --server-side --force-conflicts
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

## 4. Crear la Application de ArgoCD (apunta al repo, rama `gestion`, carpeta `k8s/`)

```powershell
kubectl apply -f k8s/argocd/application.yaml
```

ArgoCD queda en modo `automated` con `prune` y `selfHeal` — sincroniza solo y aplica
namespace, postgres, backend, frontend, prometheus y grafana, pulleando las imágenes
`:latest` desde DockerHub (`imagePullPolicy: Always`).

Verificar:
```powershell
kubectl get application -n argocd
kubectl get pods -n mindbridge -w
```
(Ctrl+C cuando todo diga `1/1 Running`)

## 5. Acceder a las apps

```powershell
minikube service mindbridge-frontend -n mindbridge --url
minikube service mindbridge-backend -n mindbridge --url   # swagger en /api/docs
minikube service grafana -n mindbridge --url              # admin/admin
```

## 6. Acceder a la UI de ArgoCD

```powershell
kubectl patch svc argocd-server -n argocd -p '{\"spec\": {\"type\": \"NodePort\"}}'
minikube service argocd-server -n argocd
```

Usuario: `admin`. Contraseña:
```powershell
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | %{[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_))}
```

## 7. Flujo normal de trabajo (con CI/CD ya armado)

1. Cambiás código → `git push`
2. GitHub Actions corre los tests y, si pasan, sube nuevas imágenes a DockerHub (`:latest` y `:<sha>`)
3. ArgoCD detecta el cambio en el repo (manifests) y/o re-pullea `:latest` y reconcilia el cluster solo

Si solo cambió código (sin tocar manifests) y querés forzar que los pods tomen la imagen `:latest`
nueva sin esperar:
```powershell
kubectl rollout restart deployment mindbridge-backend -n mindbridge
kubectl rollout restart deployment mindbridge-frontend -n mindbridge
```

## 8. Debug
```powershell
kubectl logs <pod-name> -n mindbridge
kubectl describe pod <pod-name> -n mindbridge
kubectl get application mindbridge -n argocd -o jsonpath='{.status.sync.status} / {.status.health.status}'
```

## 9. Apagar
```powershell
minikube stop        # pausa, conserva todo
minikube delete       # borra el cluster completo (hay que rehacer todo desde el paso 1)
```

---

## Notas importantes
- `imagePullPolicy: Always` en backend/frontend → siempre pullea `:latest` de DockerHub. Tras un
  push con CI exitoso, usar `kubectl rollout restart` (paso 7) para tomar la imagen nueva.
- El frontend usa proxy interno (`next.config.ts` rewrites) — `BACKEND_INTERNAL_URL` se hornea en
  el build (lo hace GitHub Actions con `--build-arg`), no es runtime env var.
- Postgres usa PVC — los datos persisten entre reinicios de pod, pero `minikube delete` los borra.
- Los `secret.yaml` reales nunca van a git — ArgoCD no los gestiona, así que `prune` no los borra.
