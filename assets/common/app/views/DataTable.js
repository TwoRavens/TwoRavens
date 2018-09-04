import m from 'mithril';

import Table from './Table';

let raw_data = String.raw`
===============================================
                        Dependent variable:    
                    ---------------------------
                               dist            
-----------------------------------------------
speed                        3.932***          
                              (0.416)          
                                               
Constant                     -17.579**         
                              (6.758)          
                                               
-----------------------------------------------
Observations                    50             
R2                             0.651           
Adjusted R2                    0.644           
Residual Std. Error      15.380 (df = 48)      
F Statistic           89.567*** (df = 1; 48)   
===============================================
Note:               *p<0.1; **p<0.05; ***p<0.01
`;

export default {
    view(_vnode) {
        let rows = raw_data.split('\n');
        let col2 = rows[3].indexOf('-');
        let trim = x => rows[x].slice(col2).trim();
        let data = [['', `${trim(2)} ${trim(4)}`]];
        rows.slice(5).forEach(x => {
            if (x.trim() === '' || x.startsWith('=') || x.startsWith('-')) return;
            let row = [x.slice(0, col2).trim(), x.slice(col2).trim()];
            if (row[0] === '') {
                data[data.length-1][1] += ` ${row[1]}`;
                return;
            }
            data.push(row);
        });
        return m(Table, {id: 'datatable', data});
    }
};
