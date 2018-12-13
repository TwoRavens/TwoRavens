import m from 'mithril';
import Table from '../../common/views/Table';

/*
library(stargazer)
data(cars)
fit <- lm(dist~speed, data=cars)
stargazer(fit)
*/

let stargazer = String.raw`
<table style="text-align:center"><tr><td colspan="2" style="border-bottom: 1px solid black"></td></tr><tr><td style="text-align:left"></td><td><em>Dependent variable:</em></td></tr>
<tr><td></td><td colspan="1" style="border-bottom: 1px solid black"></td></tr>
<tr><td style="text-align:left"></td><td>dist</td></tr>
<tr><td colspan="2" style="border-bottom: 1px solid black"></td></tr><tr><td style="text-align:left">speed</td><td>3.932<sup>***</sup></td></tr>
<tr><td style="text-align:left"></td><td>(0.416)</td></tr>
<tr><td style="text-align:left"></td><td></td></tr>
<tr><td style="text-align:left">Constant</td><td>-17.579<sup>**</sup></td></tr>
<tr><td style="text-align:left"></td><td>(6.758)</td></tr>
<tr><td style="text-align:left"></td><td></td></tr>
<tr><td colspan="2" style="border-bottom: 1px solid black"></td></tr><tr><td style="text-align:left">Observations</td><td>50</td></tr>
<tr><td style="text-align:left">R<sup>2</sup></td><td>0.651</td></tr>
<tr><td style="text-align:left">Adjusted R<sup>2</sup></td><td>0.644</td></tr>
<tr><td style="text-align:left">Residual Std. Error</td><td>15.380 (df = 48)</td></tr>
<tr><td style="text-align:left">F Statistic</td><td>89.567<sup>***</sup> (df = 1; 48)</td></tr>
<tr><td colspan="2" style="border-bottom: 1px solid black"></td></tr><tr><td style="text-align:left"><em>Note:</em></td><td style="text-align:right"><sup>*</sup>p<0.1; <sup>**</sup>p<0.05; <sup>***</sup>p<0.01</td
></tr>
</table>
`;

/*
library(stargazer)
data(swiss)
fit1 <- lm(Fertility~Agriculture, data=swiss)
fit2 <- lm(Fertility~Agriculture+Examination, data=swiss)
fit3 <- lm(Fertility~Agriculture+Examination+Education, data=swiss)
stargazer(fit1, fit2, fit3, type='html')
*/

let stargazer_multi = String.raw`
<table style="text-align:center"><tr><td colspan="4" style="border-bottom: 1px solid black"></td></tr><tr><td style="text-align:left"></td><td colspan="3"><em>Dependent variable:</em></td></tr>
<tr><td></td><td colspan="3" style="border-bottom: 1px solid black"></td></tr>
<tr><td style="text-align:left"></td><td colspan="3">Fertility</td></tr>
<tr><td style="text-align:left"></td><td>(1)</td><td>(2)</td><td>(3)</td></tr>
<tr><td colspan="4" style="border-bottom: 1px solid black"></td></tr><tr><td style="text-align:left">Agriculture</td><td>0.194<sup>**</sup></td><td>-0.094</td><td>-0.180<sup>**</sup></td></tr>
<tr><td style="text-align:left"></td><td>(0.077)</td><td>(0.086)</td><td>(0.081)</td></tr>
<tr><td style="text-align:left"></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:left">Examination</td><td></td><td>-1.195<sup>***</sup></td><td>-0.797<sup>***</sup></td></tr>
<tr><td style="text-align:left"></td><td></td><td>(0.245)</td><td>(0.247)</td></tr>
<tr><td style="text-align:left"></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:left">Education</td><td></td><td></td><td>-0.672<sup>***</sup></td></tr>
<tr><td style="text-align:left"></td><td></td><td></td><td>(0.194)</td></tr>
<tr><td style="text-align:left"></td><td></td><td></td><td></td></tr>
<tr><td style="text-align:left">Constant</td><td>60.304<sup>***</sup></td><td>94.610<sup>***</sup></td><td>99.802<sup>***</sup></td></tr>
<tr><td style="text-align:left"></td><td>(4.251)</td><td>(7.827)</td><td>(7.155)</td></tr>
<tr><td style="text-align:left"></td><td></td><td></td><td></td></tr>
<tr><td colspan="4" style="border-bottom: 1px solid black"></td></tr><tr><td style="text-align:left">Observations</td><td>47</td><td>47</td><td>47</td></tr>
<tr><td style="text-align:left">R<sup>2</sup></td><td>0.125</td><td>0.433</td><td>0.557</td></tr>
<tr><td style="text-align:left">Adjusted R<sup>2</sup></td><td>0.105</td><td>0.407</td><td>0.526</td></tr>
<tr><td style="text-align:left">Residual Std. Error</td><td>11.816 (df = 45)</td><td>9.621 (df = 44)</td><td>8.601 (df = 43)</td></tr>
<tr><td style="text-align:left">F Statistic</td><td>6.409<sup>**</sup> (df = 1; 45)</td><td>16.774<sup>***</sup> (df = 2; 44)</td><td>18.011<sup>***</sup> (df = 3; 43)</td></tr>
<tr><td colspan="4" style="border-bottom: 1px solid black"></td></tr><tr><td style="text-align:left"><em>Note:</em></td><td colspan="3" style="text-align:right"><sup>*</sup>p<0.1; <sup>**</sup>p<0.05; <sup>***</su
p>p<0.01</td></tr>
</table>
`;

/*
library(xtable)
data(cars)
fit <- lm(dist~speed, data=cars)
print(xtable(fit), type='html')
*/

let xtable = String.raw`
<table border=1>
<tr> <th>  </th> <th> Estimate </th> <th> Std. Error </th> <th> t value </th> <th> Pr(&gt;|t|) </th>  </tr>
  <tr> <td align="right"> (Intercept) </td> <td align="right"> -17.5791 </td> <td align="right"> 6.7584 </td> <td align="right"> -2.60 </td> <td align="right"> 0.0123 </td> </tr>
  <tr> <td align="right"> speed </td> <td align="right"> 3.9324 </td> <td align="right"> 0.4155 </td> <td align="right"> 9.46 </td> <td align="right"> 0.0000 </td> </tr>
   </table>
`;

export default class DataTable {
    view(vnode) {
        let html = document.createElement('html');
        html.innerHTML = vnode.attrs.data;
        let els = (el, tag) => el.getElementsByTagName(tag);
        let push = (arr, el) => arr.push(el.innerText.trim());
        let headers = [];
        for (let th of els(html, 'th'))
            push(headers, th);
        let data = [];
        for (let tr of els(html, 'tr')) {
            let row = [];
            for (let td of els(tr, 'td'))
                push(row, td);
            if (row.join('') !== '') data.push(row);
        }

        return m(Table, {
            id: 'datatable',
            data: data.slice(2, data.length),
            headers: ['', `Dependent Variable: ${vnode.attrs.variable}`],
            // attrsAll: {data: headers, style: {border: '1px solid #FF5733', background: selVarColor}},
            attrsAll: {
                style: {
                    width: '100%',
                    height: '100%',
                    overflow: 'auto',
                    display: 'block',
                    border: '1px solid #ddd',
                    margin: '1em',
                    padding: '1em',
                    'text-align': 'left',
                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)',
                    background: 'rgba(0,0,0,0)'
                }
            }
        });
    }
};
