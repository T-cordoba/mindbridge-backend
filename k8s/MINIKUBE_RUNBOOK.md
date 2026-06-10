# Runbook — levantar MindBridge en Minikube

## 1. Iniciar Minikube
```powershell
minikube start --driver=docker
```

## 2. Apuntar Docker al daemon de Minikube (cada terminal nueva)
```powershell
minikube docker-env | Invoke-Expression
```

## 3. Buildear imágenes

### Backend
```powershell
cd C:\Users\Tomas\VisualProjects\mindbridge-backend
docker build -t tcordoba24/mindbridge-backend:latest .
```

### Frontend
```powershell
cd C:\Users\Tomas\VisualProjects\mindbridge-frontend
docker build --build-arg BACKEND_INTERNAL_URL=http://mindbridge-backend:4000 -t tcordoba24/mindbridge-frontend:latest .
```

## 4. Secrets (solo la primera vez, son gitignored)

Copiar y completar:
- `k8s/postgres/secret.example.yaml` → `k8s/postgres/secret.yaml`
- `k8s/backend/secret.example.yaml` → `k8s/backend/secret.yaml`
  - Llenar `NVIDIA_API_KEY`, `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY`

## 5. Aplicar manifests
```powershell
cd C:\Users\Tomas\VisualProjects\mindbridge-backend
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/monitoring/prometheus/
kubectl apply -f k8s/monitoring/grafana/
```

## 6. Verificar pods
```powershell
kubectl get pods -n mindbridge -w
```
(Ctrl+C cuando todos digan `1/1 Running`)

## 7. Acceder

```powershell
minikube service mindbridge-frontend -n mindbridge --url
minikube service mindbridge-backend -n mindbridge --url   # swagger en /api/docs
minikube service grafana -n mindbridge --url              # admin/admin
```

## 8. Debug
```powershell
kubectl logs <pod-name> -n mindbridge
kubectl describe pod <pod-name> -n mindbridge
```

## 9. Reaplicar tras cambiar código
```powershell
# rebuild imagen correspondiente (paso 3) y luego:
kubectl rollout restart deployment <nombre> -n mindbridge
kubectl rollout status deployment <nombre> -n mindbridge
```

## 10. Apagar
```powershell
minikube stop        # pausa, conserva todo
minikube delete       # borra el cluster completo (hay que rehacer todo desde el paso 1)
```

---

## Notas importantes
- `imagePullPolicy: Never` en backend/frontend → siempre hay que rebuildear dentro del docker-env de Minikube, nunca se descargan de DockerHub.
- El frontend usa proxy interno (`next.config.ts` rewrites) — `BACKEND_INTERNAL_URL` se hornea en el build, no es runtime env var.
- Postgres usa PVC — los datos persisten entre reinicios de pod, pero `minikube delete` los borra.
