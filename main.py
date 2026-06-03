# Calculadora de Programación Lineal
# Implementación en Python + Tkinter
# Soporta: método gráfico (2 variables), Simplex y Dos Fases

import tkinter as tk
from tkinter import ttk, messagebox
import numpy as np
import re
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

from simplex_solver import SimplexSolver
from graphical_solver import GraphicalSolver
from parser import parse_input_text

# --- GUI ---
class LPApp:
    def __init__(self, root):
        self.root = root
        root.title('Calculadora PPL - Tkinter')
        self.frame = ttk.Frame(root, padding=10)
        self.frame.pack(fill=tk.BOTH, expand=True)
        # Problem size
        size_frame = ttk.Frame(self.frame)
        size_frame.pack(fill=tk.X)
        ttk.Label(size_frame, text='Variables:').pack(side=tk.LEFT)
        self.var_spin = tk.Spinbox(size_frame, from_=2, to=6, width=3)
        self.var_spin.pack(side=tk.LEFT, padx=5)
        ttk.Label(size_frame, text='Restricciones:').pack(side=tk.LEFT, padx=(10,0))
        self.cons_spin = tk.Spinbox(size_frame, from_=1, to=8, width=3)
        self.cons_spin.pack(side=tk.LEFT, padx=5)
        ttk.Button(size_frame, text='Crear matriz', command=self.build_matrix).pack(side=tk.LEFT, padx=10)
        # Method selection
        method_frame = ttk.Frame(self.frame)
        method_frame.pack(fill=tk.X, pady=5)
        ttk.Label(method_frame, text='Método:').pack(side=tk.LEFT)
        self.method_var = tk.StringVar(value='simplex')
        ttk.Radiobutton(method_frame, text='Simplex', variable=self.method_var, value='simplex').pack(side=tk.LEFT)
        ttk.Radiobutton(method_frame, text='Dos Fases', variable=self.method_var, value='two-phase').pack(side=tk.LEFT)
        ttk.Radiobutton(method_frame, text='Gráfico (2 var)', variable=self.method_var, value='graphical').pack(side=tk.LEFT)
        # Objective
        obj_frame = ttk.Frame(self.frame)
        obj_frame.pack(fill=tk.X, pady=5)
        ttk.Label(obj_frame, text='Objetivo (Max/Min):').pack(side=tk.LEFT)
        self.obj_type = tk.StringVar(value='Max')
        ttk.Combobox(obj_frame, textvariable=self.obj_type, values=['Max','Min'], width=5).pack(side=tk.LEFT, padx=5)
        ttk.Label(obj_frame, text='Ingrese la función objetivo en el área de restricciones (ej: Max: 3x + 5y).').pack(side=tk.LEFT, padx=10)
        # Matrix area
        self.matrix_frame = ttk.Frame(self.frame)
        self.matrix_frame.pack(fill=tk.BOTH, pady=5)
        # Solve button
        solve_frame = ttk.Frame(self.frame)
        solve_frame.pack(fill=tk.X)
        ttk.Button(solve_frame, text='Resolver', command=self.solve).pack(side=tk.LEFT)
        ttk.Button(solve_frame, text='Mostrar pasos Simplex', command=self.show_steps).pack(side=tk.LEFT, padx=5)
        # Output area
        out_frame = ttk.Frame(self.frame)
        out_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        self.text = tk.Text(out_frame, height=12)
        self.text.pack(fill=tk.BOTH, expand=True)
        # Plot area
        self.fig = plt.Figure(figsize=(5,4))
        self.ax = self.fig.add_subplot(111)
        self.canvas = FigureCanvasTkAgg(self.fig, master=self.frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

    def build_matrix(self):
        for w in self.matrix_frame.winfo_children():
            w.destroy()
        n = int(self.var_spin.get())
        m = int(self.cons_spin.get())
        ttk.Label(self.matrix_frame, text='Escriba las restricciones, una por línea. Ejemplo: x + 2y <= 8').pack()
        self.cons_text = tk.Text(self.matrix_frame, height=6)
        self.cons_text.pack(fill=tk.BOTH, expand=True)
        ttk.Label(self.matrix_frame, text='Variables esperadas: use x,y,z o x1,x2,... según el número de variables.').pack()
        ttk.Label(self.matrix_frame, text='Función objetivo: escriba en la siguiente línea (ej: Max: 3x + 5y o 3x+5y)').pack()
        self.obj_entry = ttk.Entry(self.matrix_frame, width=60)
        self.obj_entry.pack(fill=tk.X)

    def parse_inputs(self):
        try:
            n = int(self.var_spin.get())
            # read objective expression
            obj_str = ''
            if hasattr(self, 'obj_entry') and self.obj_entry.get().strip():
                obj_str = self.obj_entry.get().strip()
            # read constraints text
            cons_text = ''
            if hasattr(self, 'cons_text'):
                cons_text = self.cons_text.get('1.0', tk.END).strip()
            maximize = (self.obj_type.get() == 'Max')
            # if objective has Max/Min prefix, respect it
            mobj = re.match(r'^(Max|min)\s*[:]?\s*(.*)', obj_str, re.I)
            if mobj:
                if mobj.group(1).lower() == 'min':
                    maximize = False
                else:
                    maximize = True
                obj_expr = mobj.group(2)
            else:
                obj_expr = obj_str
            # parser for linear expressions
            def parse_linear(expr):
                expr = expr.replace(' ', '')
                if expr == '':
                    return {}
                if expr[0] not in '+-':
                    expr = '+' + expr
                tokens = re.finditer(r'([+-]?\d*\.?\d*)\s*([a-zA-Z]\w*)', expr)
                res = {}
                for t in tokens:
                    coef_str = t.group(1).replace(' ', '')
                    var = t.group(2)
                    if coef_str in ['', '+', '-']:
                        coef = 1.0 if coef_str in ['', '+'] else -1.0
                    else:
                        coef = float(coef_str)
                    res[var] = res.get(var, 0.0) + coef
                return res
            c_dict = parse_linear(obj_expr or '')
            # parse constraints
            # accept constraints separated by newlines, commas or semicolons
            lines = [ln.strip() for ln in re.split('[\n,;]+', cons_text) if ln.strip()]
            if not lines:
                raise ValueError('No se han introducido restricciones')
            A_rows = []
            b = []
            senses = []
            order = ['x', 'y', 'z', 'w', 'u', 'v']
            for line in lines:
                mm = re.search(r'(<=|>=|=)', line)
                if not mm:
                    raise ValueError(f'Restricción sin operador válido: {line}')
                op = mm.group(1)
                lhs = line[:mm.start()].strip()
                rhs = line[mm.end():].strip()
                rhs_val = float(rhs)
                lhs_dict = parse_linear(lhs)
                row = np.zeros(n)
                for var, coef in lhs_dict.items():
                    idx = None
                    m2 = re.match(r'^[xX](\d+)$', var)
                    if m2:
                        idx = int(m2.group(1)) - 1
                    elif len(var) == 1 and var.lower() in order:
                        idx = order.index(var.lower())
                    else:
                        m3 = re.match(r'^([a-zA-Z])(\d+)$', var)
                        if m3:
                            idx = int(m3.group(2)) - 1
                    if idx is None or idx < 0 or idx >= n:
                        continue
                    row[idx] = coef
                A_rows.append(row)
                b.append(rhs_val)
                senses.append(op)
            A = np.array(A_rows)
            b = np.array(b, dtype=float)
            c = [0.0] * n
            for var, coef in c_dict.items():
                idx = None
                m2 = re.match(r'^[xX](\d+)$', var)
                if m2:
                    idx = int(m2.group(1)) - 1
                elif len(var) == 1 and var.lower() in order:
                    idx = order.index(var.lower())
                else:
                    m3 = re.match(r'^([a-zA-Z])(\d+)$', var)
                    if m3:
                        idx = int(m3.group(2)) - 1
                if idx is None or idx < 0 or idx >= n:
                    continue
                c[idx] = coef
            return c, A, b, senses, maximize
        except Exception as e:
            messagebox.showerror('Error', f'Entrada inválida: {e}')
            return None

    def solve(self):
        data = self.parse_inputs()
        if data is None: return
        c, A, b, senses, maximize = data
        method = self.method_var.get()
        self.text.delete('1.0', tk.END)
        self.ax.clear()
        if method == 'graphical':
            if A.shape[1] != 2:
                messagebox.showerror('Error', 'El método gráfico requiere exactamente 2 variables')
                return
            gs = GraphicalSolver(c, A, b, senses, maximize)
            try:
                sol, val, verts = gs.solve()
            except Exception as e:
                messagebox.showerror('Error', str(e))
                return
            self.text.insert(tk.END, f'Solución: {sol}\nValor objetivo: {val}\n')
            # plot feasible points
            xs = [p[0] for p in verts]
            ys = [p[1] for p in verts]
            self.ax.scatter(xs, ys, c='blue')
            self.ax.scatter([sol[0]], [sol[1]], c='red')
            # plot constraint lines
            x_vals = np.linspace(0, max(xs + [1])*1.2, 200)
            for i in range(A.shape[0]):
                a1, a2 = A[i]
                if abs(a2) < 1e-9: continue
                y = (b[i] - a1 * x_vals) / a2
                self.ax.plot(x_vals, y, label=f'{a1}x+{a2}y {senses[i]} {b[i]}')
            self.ax.set_xlim(left=0)
            self.ax.set_ylim(bottom=0)
            self.ax.legend()
            self.canvas.draw()
        else:
            try:
                solver = SimplexSolver(c, A, b, senses, maximize)
                x, z, tables = solver.solve()
            except Exception as e:
                messagebox.showerror('Error', str(e))
                return
            self.text.insert(tk.END, f'Solución: {x}\nValor objetivo: {z}\n')
            # display basic plot for 2-var
            if A.shape[1] == 2:
                # reuse graphical to plot feasible region if possible
                try:
                    gs = GraphicalSolver(c, A, b, senses, maximize)
                    _, _, verts = gs.solve()
                    xs = [p[0] for p in verts]
                    ys = [p[1] for p in verts]
                    self.ax.scatter(xs, ys, c='blue')
                    self.ax.scatter([x[0]], [x[1]], c='red')
                    self.ax.set_xlim(left=0)
                    self.ax.set_ylim(bottom=0)
                    self.canvas.draw()
                except Exception:
                    pass

    def show_steps(self):
        data = self.parse_inputs()
        if data is None: return
        c, A, b, senses, maximize = data
        try:
            solver = SimplexSolver(c, A, b, senses, maximize)
            x, z, tables = solver.solve()
        except Exception as e:
            messagebox.showerror('Error', str(e))
            return
        # show each tableau
        self.text.delete('1.0', tk.END)
        for k, T in enumerate(tables):
            self.text.insert(tk.END, f'Tablau {k}:\n')
            self.text.insert(tk.END, np.array2string(T, precision=4, suppress_small=True) + '\n\n')

if __name__ == '__main__':
    root = tk.Tk()
    app = LPApp(root)
    root.mainloop()
