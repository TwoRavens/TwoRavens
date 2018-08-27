import m from 'mithril';
import {latexParser} from 'latex-parser';

let data = String.raw`
    \begin{table}[!htbp] \centering
        \caption{}
        \label{}
    \begin{tabular}{@{\extracolsep{5pt}}lc}
    \\[-1.8ex]\hline
    \hline \\[-1.8ex]
        & \multicolumn{1}{c}{\textit{Dependent variable:}} \\
    \cline{2-2}
    \\[-1.8ex] & dist \\
    \hline \\[-1.8ex]
        speed & 3.932$^{***}$ \\
        & (0.416) \\
        & \\
        Constant & $-$17.579$^{**}$ \\
        & (6.758) \\
        & \\
    \hline \\[-1.8ex]
    Observations & 50 \\
    R$^{2}$ & 0.651 \\
    Adjusted R$^{2}$ & 0.644 \\
    Residual Std. Error & 15.380 (df = 48) \\
    F Statistic & 89.567$^{***}$ (df = 1; 48) \\
    \hline
    \hline \\[-1.8ex]
    \textit{Note:}  & \multicolumn{1}{r}{$^{*}$p$<$0.1; $^{**}$p$<$0.05; $^{***}$p$<$0.01} \\
    \end{tabular}
    \end{table}
`;

export default {
    view(_vnode) {
        let {value} = latexParser.parse(data);
        let table = [];
        value.forEach(x => {
            if (x.name !== 'table') return;
            x.latex.forEach(x => {
                if (x.name !== 'tabular') return;
                let row = [];
                x.latex.forEach((x, i) => {
                    if (x.type === 'TeXRaw') x.text = x.text.trim();
                    if (x.text === '' || x.name === 'hline' || x.name === 'cline') return;
                    if (x.name === '\\') {
                        if (row.length === 1 && row[0] === '') row.pop();
                        if (row.length === 0) return;
                        table.push(row);
                        row = [];
                        return;
                    };
                    if (x.text && x.text.includes('&')) {
                        let $row = x.text.split('&').map(x => x.trim());
                        if (row.length > 0 && $row[0] === '') $row = $row.slice(1);
                        if ($row[$row.length - 1] === '') $row.pop();
                        row = row.concat($row);
                        return;
                    }
                    if (x.type === 'Dollar') {
                        let {symbol} = x.latex[0];
                        if (symbol) {
                            row[row.length - 1] = row[row.length - 1] + symbol;
                            return;
                        }
                    }
                    if (row.length > 0 && row[row.length - 1].type === 'Dollar') {
                        row[row.length - 1] = row[row.length - 1].latex[0].text + x;
                        return;
                    }
                    if (x.type && !x.text) {
                        console.log(x);
                    }
                    row.push(x.text || x);
                });
            });
        });
        return m('', table.slice(1).map(x => m('div', `${x}`)));
    }
};
