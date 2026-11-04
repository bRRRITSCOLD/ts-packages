#!/usr/bin/env bash
# PROTOTYPE, wipe me. Brings Penpot up on the local k3s and port-forwards it to localhost:9001.
# Tear down: kubectl delete ns penpot-proto
set -euo pipefail
cd "$(dirname "$0")"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

kubectl apply -f k8s/data.yaml
kubectl -n penpot-proto get secret penpot-proto-secrets >/dev/null 2>&1 ||
  kubectl -n penpot-proto create secret generic penpot-proto-secrets \
    --from-literal=apiSecretKey="$(openssl rand -base64 64 | tr -d '\n=+/')"
kubectl apply -f k8s/penpot.yaml

echo "waiting for penpot deployments..."
until kubectl -n penpot-proto get deploy penpot-frontend >/dev/null 2>&1; do sleep 3; done
kubectl -n penpot-proto rollout status deploy --timeout=10m

echo "Penpot on http://localhost:9001 (Ctrl-C stops the port-forward)"
exec kubectl -n penpot-proto port-forward svc/penpot 9001:8080
