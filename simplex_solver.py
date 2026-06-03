import numpy as np

class SimplexSolver:
    def __init__(self, c, A, b, senses, maximize=True):
        self.c = np.array(c, dtype=float)
        self.A = np.array(A, dtype=float)
        self.b = np.array(b, dtype=float)
        self.senses = senses
        self.maximize = maximize
        self.tables = []

    def _to_standard_form(self):
        m, n = self.A.shape
        A = self.A.copy()
        b = self.b.copy()
        slack_cols = []
        art_cols = []
        M = A.tolist()
        for i, s in enumerate(self.senses):
            if s == '<=':
                for r in range(m):
                    M[r].append(1.0 if r == i else 0.0)
                slack_cols.append(n + len(slack_cols))
            elif s == '>=':
                for r in range(m):
                    M[r].append(-1.0 if r == i else 0.0)
                surplus_col = n + len(slack_cols)
                slack_cols.append(surplus_col)
                for r in range(m):
                    M[r].append(1.0 if r == i else 0.0)
                art_cols.append(n + len(slack_cols))
            elif s == '=':
                for r in range(m):
                    M[r].append(1.0 if r == i else 0.0)
                art_cols.append(n + len(slack_cols))
            else:
                raise ValueError('Unknown sense')
        A_std = np.array(M, dtype=float)
        return A_std, b, art_cols, n

    def _initialize_tableau(self, A, b, c, basic_vars):
        m, n = A.shape
        tableau = np.zeros((m+1, n+1))
        tableau[:m, :n] = A
        tableau[:m, -1] = b
        tableau[-1, :n] = -c if self.maximize else c
        return tableau

    def _pivot(self, T, row, col):
        T[row,:] = T[row,:] / T[row,col]
        m, n = T.shape
        for r in range(m):
            if r != row:
                T[r,:] = T[r,:] - T[r,col] * T[row,:]

    def _extract_solution(self, T, basic_vars, n_orig):
        m = T.shape[0] - 1
        x = np.zeros(n_orig)
        for i, bv in enumerate(basic_vars):
            if bv < n_orig:
                x[bv] = T[i, -1]
        z = T[-1,-1]
        return x, z

    def solve(self):
        A_std, b, art_cols, n_orig = self._to_standard_form()
        m, n = A_std.shape
        basic_vars = []
        for j in range(n):
            col = A_std[:, j]
            if np.sum(np.isclose(col, [1])) == 1 and np.count_nonzero(col) == 1:
                row = np.where(np.isclose(col,1))[0][0]
                basic_vars.append(j)
        if len(basic_vars) < m:
            for j in range(n):
                if j not in basic_vars:
                    basic_vars.append(j)
                if len(basic_vars) == m:
                    break
        c_exp = np.zeros(n)
        c_exp[:n_orig] = self.c
        T = self._initialize_tableau(A_std, b, c_exp, basic_vars)
        self.tables = [T.copy()]
        max_iters = 200
        it = 0
        while it < max_iters:
            it += 1
            last_row = T[-1,:-1]
            if self.maximize:
                idxs = np.where(last_row < -1e-9)[0]
            else:
                idxs = np.where(last_row > 1e-9)[0]
            if idxs.size == 0:
                break
            col = idxs[0]
            ratios = []
            for i in range(T.shape[0]-1):
                a = T[i,col]
                if a > 1e-9:
                    ratios.append(T[i,-1] / a)
                else:
                    ratios.append(np.inf)
            row = int(np.argmin(ratios))
            if ratios[row] == np.inf:
                raise Exception('Unbounded')
            self._pivot(T, row, col)
            self.tables.append(T.copy())
        x, z = self._extract_solution(T, basic_vars, n_orig)
        return x, z, self.tables
