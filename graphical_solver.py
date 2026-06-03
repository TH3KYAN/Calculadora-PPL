import numpy as np

class GraphicalSolver:
    def __init__(self, c, A, b, senses, maximize=True):
        self.c = np.array(c, dtype=float)
        self.A = np.array(A, dtype=float)
        self.b = np.array(b, dtype=float)
        self.senses = senses
        self.maximize = maximize

    def feasible_vertices(self):
        m = self.A.shape[0]
        pts = []
        for i in range(m):
            for j in range(i+1, m):
                A2 = np.vstack([self.A[i], self.A[j]])
                b2 = np.array([self.b[i], self.b[j]])
                try:
                    sol = np.linalg.solve(A2, b2)
                    if np.all(np.isfinite(sol)):
                        pts.append(sol)
                except np.linalg.LinAlgError:
                    continue
        for i in range(m):
            a1, a2 = self.A[i]
            if abs(a2) > 1e-9:
                y = self.b[i] / a2
                pts.append(np.array([0.0, y]))
            if abs(a1) > 1e-9:
                x = self.b[i] / a1
                pts.append(np.array([x, 0.0]))
        uniq = []
        for p in pts:
            if p[0] >= -1e-9 and p[1] >= -1e-9:
                keep = True
                for q in uniq:
                    if np.allclose(p, q, atol=1e-6):
                        keep = False
                        break
                if keep:
                    uniq.append(p)
        feasible = []
        for p in uniq:
            ok = True
            for i in range(self.A.shape[0]):
                lhs = np.dot(self.A[i], p)
                s = self.senses[i]
                if s == '<=' and lhs - self.b[i] > 1e-6:
                    ok = False; break
                if s == '>=' and lhs - self.b[i] < -1e-6:
                    ok = False; break
                if s == '=' and abs(lhs - self.b[i]) > 1e-6:
                    ok = False; break
            if ok:
                feasible.append(p)
        return feasible

    def solve(self):
        verts = self.feasible_vertices()
        if not verts:
            raise Exception('No feasible vertices found')
        best = None
        best_val = None
        for v in verts:
            val = np.dot(self.c, v)
            if best is None:
                best = v; best_val = val
            else:
                if self.maximize:
                    if val > best_val: best, best_val = v, val
                else:
                    if val < best_val: best, best_val = v, val
        return best, best_val, verts
