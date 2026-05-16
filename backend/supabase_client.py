import os
from dotenv import load_dotenv

load_dotenv()

try:
	from supabase import create_client, Client  # type: ignore

	_url: str | None = os.environ.get("SUPABASE_URL")
	_key: str | None = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

	if _url and _key:
		supabase: Client = create_client(_url, _key)
	else:
		raise KeyError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
except Exception:
	# Fallback: simple in-memory stub for local development when Supabase
	# credentials are not provided. This avoids runtime import errors and
	# allows the backend to run without a remote DB during development.
	from typing import Any, Dict, List, Optional


	class _Response:
		def __init__(self, data: Any):
			self.data = data


	class _Table:
		def __init__(self, name: str, store: Dict[str, List[Dict[str, Any]]]):
			self.name = name
			self.store = store
			self._payload: Optional[Dict[str, Any]] = None
			self._filters: Dict[str, Any] = {}
			self._maybe_single = False
			self._op: Optional[str] = None

		def upsert(self, payload: Dict[str, Any], on_conflict: str = ""):
			self._op = "upsert"
			self._payload = payload
			self._conflict = on_conflict
			return self

		def insert(self, payload: Dict[str, Any]):
			self._op = "insert"
			self._payload = payload
			return self

		def select(self, _cols: str = "*"):
			self._op = "select"
			return self

		def maybe_single(self):
			self._maybe_single = True
			return self

		def eq(self, key: str, value: Any):
			self._filters[key] = value
			return self

		def order(self, key: str):
			self._order_key = key
			return self

		def execute(self):
			table = self.store.setdefault(self.name, [])
			if self._op == "upsert" and self._payload is not None:
				key = self._conflict
				# find by conflict key, default to 'id' or 'user_id'
				conflict_key = key or ("id" if "id" in self._payload else "user_id")
				found = False
				for i, row in enumerate(table):
					if row.get(conflict_key) == self._payload.get(conflict_key):
						table[i] = {**row, **self._payload}
						found = True
						break
				if not found:
					table.append(dict(self._payload))
				return _Response({})

			if self._op == "insert" and self._payload is not None:
				table.append(dict(self._payload))
				return _Response({})

			if self._op == "select":
				# apply filters
				results = [r for r in table]
				for k, v in self._filters.items():
					results = [r for r in results if r.get(k) == v]
				# ordering
				if hasattr(self, "_order_key"):
					results.sort(key=lambda x: x.get(self._order_key))
				if self._maybe_single:
					return _Response(results[0] if results else None)
				return _Response(results)

			return _Response(None)


	class _Client:
		def __init__(self):
			self._store: Dict[str, List[Dict[str, Any]]] = {}

		def table(self, name: str) -> _Table:
			return _Table(name, self._store)


	supabase = _Client()
