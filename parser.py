import re
import numpy as np

order = ['x', 'y', 'z', 'w', 'u', 'v']

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


def parse_input_text(n, obj_str, cons_text, obj_type):
    maximize = (obj_type == 'Max')
    mobj = re.match(r'^(Max|min)\s*[:]?\s*(.*)', (obj_str or '').strip(), re.I)
    if mobj:
        if mobj.group(1).lower() == 'min':
            maximize = False
        else:
            maximize = True
        obj_expr = mobj.group(2)
    else:
        obj_expr = obj_str or ''
    c_dict = parse_linear(obj_expr or '')
    lines = [ln.strip() for ln in re.split('[\n,;]+', cons_text or '') if ln.strip()]
    if not lines:
        raise ValueError('No se han introducido restricciones')
    A_rows = []
    b = []
    senses = []
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
