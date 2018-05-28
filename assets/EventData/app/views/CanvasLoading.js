import m from 'mithril';

export default class CanvasLoading {
    view(vnode) {
        let {display} = vnode.attrs;

        return m('#loading.loader', {
            style: {
                display: display,
                margin: 'auto',
                position: 'relative',
                top: '40%',
                transform: 'translateY(-50%)'
            }
        })
    }
}