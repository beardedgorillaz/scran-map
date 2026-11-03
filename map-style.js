// A grassy pixel town: sandy roads, terracotta roofs, parks full of trees.
(() => {
  const road = (id, classes, casing, fill, widths) => [
    {
      id: `${id}-edge`, type: "line", source: "world", "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", classes]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": casing, "line-width": ["interpolate", ["linear"], ["zoom"], ...widths.flatMap(([z, w]) => [z, w + 2])] },
    },
    {
      id: `${id}-fill`, type: "line", source: "world", "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", classes]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": fill, "line-width": ["interpolate", ["linear"], ["zoom"], ...widths.flatMap(([z, w]) => [z, w])] },
    },
  ];
  const label = ["coalesce", ["get", "name:en"], ["get", "name"]];

  window.SCRAN_MAP_STYLE = {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: { world: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
    layers: [
      { id: "land", type: "background", paint: { "background-color": "#8fd95a" } },
      { id: "town", type: "fill", source: "world", "source-layer": "landuse", filter: ["in", ["get", "class"], ["literal", ["residential", "commercial", "retail", "industrial", "suburb", "neighbourhood", "quarter"]]], paint: { "fill-color": "#a5e36b" } },
      { id: "green", type: "fill", source: "world", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland"]]], paint: { "fill-pattern": "trees" } },
      { id: "park", type: "fill", source: "world", "source-layer": "park", paint: { "fill-pattern": "trees" } },
      { id: "river", type: "line", source: "world", "source-layer": "waterway", paint: { "line-color": "#3fa9f5", "line-width": 2 } },
      { id: "water", type: "fill", source: "world", "source-layer": "water", paint: { "fill-color": "#3fa9f5" } },
      { id: "building", type: "fill", source: "world", "source-layer": "building", minzoom: 14, paint: { "fill-color": "#ec7f52", "fill-outline-color": "#8a3f22" } },
      ...road("small", ["minor", "service"], "#c79a58", "#f8e8b8", [[12, 0.5], [15, 4], [19, 18]]),
      ...road("mid", ["secondary", "tertiary"], "#a87b3f", "#f8e8b8", [[10, 0.8], [15, 7], [19, 26]]),
      ...road("big", ["motorway", "trunk", "primary"], "#a85a18", "#ffcf63", [[8, 1], [12, 3], [15, 9], [19, 32]]),
      {
        id: "street-names", type: "symbol", source: "world", "source-layer": "transportation_name", minzoom: 15,
        layout: { "symbol-placement": "line", "text-field": label, "text-font": ["Noto Sans Regular"], "text-size": 14 },
        paint: { "text-color": "#20263a", "text-halo-color": "#ffffff", "text-halo-width": 2 },
      },
      {
        id: "water-names", type: "symbol", source: "world", "source-layer": "water_name",
        layout: { "text-field": label, "text-font": ["Noto Sans Bold"], "text-size": 14 },
        paint: { "text-color": "#0a5e96", "text-halo-color": "#c5eeff", "text-halo-width": 2 },
      },
      {
        id: "places", type: "symbol", source: "world", "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["city", "town", "village", "suburb", "quarter"]]],
        layout: { "text-field": label, "text-font": ["Noto Sans Bold"], "text-size": ["match", ["get", "class"], "city", 20, "town", 17, 15] },
        paint: { "text-color": "#20263a", "text-halo-color": "#ffffff", "text-halo-width": 2.5 },
      },
    ],
  };
})();
