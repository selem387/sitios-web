/* Controles del editor para los bloques de IAprop Inmuebles (sin paso de compilación). */
(function (wp) {
  const { registerBlockType } = wp.blocks;
  const { createElement: el } = wp.element;
  const { InspectorControls, useBlockProps } = wp.blockEditor;
  const { PanelBody, RangeControl, ToggleControl, TextControl, SelectControl } = wp.components;
  const ServerSideRender = wp.serverSideRender;

  const preview = (name, attributes) =>
    el('div', useBlockProps(), el(ServerSideRender, { block: name, attributes }));

  registerBlockType('iaprop/listado-propiedades', {
    edit: ({ attributes: a, setAttributes: set }) => [
      el(InspectorControls, { key: 'i' },
        el(PanelBody, { title: 'Listado' },
          el(RangeControl, { label: 'Cantidad', min: 1, max: 48, value: a.cantidad, onChange: (v) => set({ cantidad: v }) }),
          el(RangeControl, { label: 'Columnas', min: 1, max: 4, value: a.columnas, onChange: (v) => set({ columnas: v }) }),
          el(SelectControl, {
            label: 'Operación', value: a.operacion,
            options: [{ label: 'Todas', value: '' }, { label: 'Venta', value: 'venta' }, { label: 'Renta', value: 'renta' }],
            onChange: (v) => set({ operacion: v }),
          }),
          el(ToggleControl, { label: 'Solo destacadas', checked: a.soloDestacadas, onChange: (v) => set({ soloDestacadas: v }) }),
          el(ToggleControl, { label: 'Aplicar filtros del buscador (URL)', checked: a.usarFiltrosUrl, onChange: (v) => set({ usarFiltrosUrl: v }) })
        )
      ),
      el('div', { key: 'p' }, preview('iaprop/listado-propiedades', a)),
    ],
    save: () => null,
  });

  registerBlockType('iaprop/buscador-propiedades', {
    edit: ({ attributes: a, setAttributes: set }) => [
      el(InspectorControls, { key: 'i' },
        el(PanelBody, { title: 'Buscador' },
          el(TextControl, { label: 'Página de resultados', value: a.destino, onChange: (v) => set({ destino: v }) })
        )
      ),
      el('div', { key: 'p' }, preview('iaprop/buscador-propiedades', a)),
    ],
    save: () => null,
  });

  registerBlockType('iaprop/ficha-propiedad', {
    edit: ({ attributes: a, setAttributes: set, context }) => [
      el(InspectorControls, { key: 'i' },
        el(PanelBody, { title: 'Contacto' },
          el(TextControl, { label: 'WhatsApp (vacío = el de Ajustes generales)', value: a.whatsapp, onChange: (v) => set({ whatsapp: v }) })
        )
      ),
      el('div', Object.assign({ key: 'p' }, useBlockProps()),
        context && context.postId
          ? el(ServerSideRender, { block: 'iaprop/ficha-propiedad', attributes: a, urlQueryArgs: { post_id: context.postId } })
          : el('p', { style: { padding: 12, background: '#f4f4f5' } }, 'Ficha de propiedad: se muestra en la página de cada propiedad.')
      ),
    ],
    save: () => null,
  });
})(window.wp);
