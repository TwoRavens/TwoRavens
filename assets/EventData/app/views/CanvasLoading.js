import m from 'mithril';

export default class CanvasLoading {
    view(vnode) {
        return m('#loading.loader', {
            style: {
                margin: 'auto',
                position: 'relative',
                top: '40%',
                transform: 'translateY(-50%)'
            }
        })
    }
}