import { WMS_BASE_DPI, type WMSSldBodyFactory } from '../requests';

// Gamtotvarkos tvarkymo plotų WMS stilius (#259): BIOMON QGIS serveris plotų
// numerius piešia kontūro spalva, tad ant ortofoto ir štricho jie nematomi.
// Serverio projekto keisti negalime, todėl stilių perduodame per `SLD_BODY`:
// geometrija atkartota pagal serverio `GetStyles`, pakeista tik etiketė.
//
// BIOMON QGIS serverio ypatumai, patikrinti gyvai:
// - su `SLD_BODY` piešiami tik SLD'e įvardinti sluoksniai (LAYERS ignoruojamas),
//   todėl NamedLayer sąrašas sudaromas iš kiekvienos užklausos LAYERS;
// - visiems NamedLayer pritaikomas PIRMOJO stilius, todėl kiekvienas sluoksnis
//   gauna tą patį stilių, o statusai (patvirtintas / rengiamas / negalioja)
//   atskiriami `statusas` lauko filtrais; nenumatytas statusas piešiamas
//   ištisiniu kontūru (`ElseFilter`), kad plotas niekada nedingtų;
// - SLD dydžiai be vienetų yra pikseliai ir pagal DPI neskaliuojami, o serverio
//   stilius – mm/pt, skaliuojamas, todėl storiai ir šriftas perskaičiuojami
//   pagal užklausos DPI (OL siunčia 90 × devicePixelRatio, kai jis ≠ 1).

// Reikšmės iš serverio stiliaus (GetStyles, 90 DPI) – keisti tik jei pasikeis
// serverio stilius.
const SERVER_STYLE = {
  outlineWidth: 2,
  draftDashArray: [4, 2],
  // Štricho poligono kontūras serveryje yra nematomas (opacity 0).
  hatchOutlineColor: '#232323',
  draftHatchOutlineWidth: 0.5,
  expiredHatchOutlineWidth: 1,
  smallPlotMaxHa: 0.5,
  smallPlotMarkerSize: 9,
  smallPlotMarkerStrokeWidth: 1,
  smallPlotMarkerScale: { min: 3000, max: 10000000 },
  labelFontFamily: 'DejaVu LGC Sans',
  labelFontSizePt: 13,
  // Numeriai rodomi tik priartinus (1:7000 ir stambiau).
  labelMaxScaleDenominator: 7000,
  labelAnchor: { x: 0, y: 0.5 },
  labelMaxDisplacement: 1,
};

const PLOT_STATUS = {
  APPROVED: 'patvirtintas',
  DRAFT: 'rengiamas',
  EXPIRED: 'negalioja',
};

// Etiketės pakeitimai: tamsus tekstas įskaitomas ir ant ortofoto, ir ant šviesaus
// topografinio fono; 2 px halo (90 DPI) – serverio ~1 px halo ant ortofoto
// neišskiria teksto, 1 ir 1.5 px lyginti gyvai ir buvo silpnesni. Bold visiems
// statusams (serveryje – tik patvirtintiems gamtotvarkos planams): užsakovui
// regular numeriai ant ortofoto vis dar buvo per ploni (#259).
const LABEL_COLOR = '#1a1a1a';
const LABEL_HALO_COLOR = '#ffffff';
const LABEL_HALO_RADIUS_PX = 2;
const LABEL_FONT_WEIGHT = 'bold';

const POINTS_PER_INCH = 72;

// Grupių spalvos – tokios pačios, kaip serverio stiliuje.
export const GAMTOTVARKA_PLOT_COLORS = {
  planai: '#ffbf00',
  tvarkymoProgramos: '#ff4e00',
  tikslinesProgramos: '#65a30d',
  veiksmuPlanai: '#003399',
  stTvarkymoPlanai: '#4d0099',
  invaVeiksmuPlanai: '#990065',
};

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svgParam = (name: string, value: string | number) =>
  `<se:SvgParameter name="${name}">${value}</se:SvgParameter>`;

const statusFilter = (status: string) => `
  <ogc:PropertyIsEqualTo>
    <ogc:PropertyName>statusas</ogc:PropertyName>
    <ogc:Literal>${status}</ogc:Literal>
  </ogc:PropertyIsEqualTo>`;

// Serverio stiliaus pikseliai nurodyti 90 DPI; kitam DPI – proporcingai.
const px = (value: number, dpi: number) => (value * dpi) / WMS_BASE_DPI;

const outline = (color: string, dpi: number, dashArray?: number[]) => `
  <se:PolygonSymbolizer>
    <se:Stroke>
      ${svgParam('stroke', color)}
      ${svgParam('stroke-width', px(SERVER_STYLE.outlineWidth, dpi))}
      ${svgParam('stroke-linejoin', 'bevel')}
      ${dashArray ? svgParam('stroke-dasharray', dashArray.map((n) => px(n, dpi)).join(' ')) : ''}
    </se:Stroke>
  </se:PolygonSymbolizer>`;

const hatch = (color: string, dpi: number, mark: 'slash' | 'x', outlineWidth: number) => `
  <se:PolygonSymbolizer>
    <se:Fill>
      <se:GraphicFill>
        <se:Graphic>
          <se:Mark>
            <se:WellKnownName>${mark}</se:WellKnownName>
            <se:Stroke>${svgParam('stroke', color)}</se:Stroke>
          </se:Mark>
        </se:Graphic>
      </se:GraphicFill>
    </se:Fill>
    <se:Stroke>
      ${svgParam('stroke', SERVER_STYLE.hatchOutlineColor)}
      ${svgParam('stroke-opacity', 0)}
      ${svgParam('stroke-width', px(outlineWidth, dpi))}
      ${svgParam('stroke-linejoin', 'bevel')}
    </se:Stroke>
  </se:PolygonSymbolizer>`;

// Mažus patvirtintus plotus serveris smulkiame mastelyje žymi apskritimu.
const smallPlotMarker = (color: string, dpi: number) => `
  <se:Rule>
    <ogc:Filter>
      <ogc:And>
        ${statusFilter(PLOT_STATUS.APPROVED)}
        <ogc:PropertyIsLessThan>
          <ogc:PropertyName>plotas_ha</ogc:PropertyName>
          <ogc:Literal>${SERVER_STYLE.smallPlotMaxHa}</ogc:Literal>
        </ogc:PropertyIsLessThan>
      </ogc:And>
    </ogc:Filter>
    <se:MinScaleDenominator>${SERVER_STYLE.smallPlotMarkerScale.min}</se:MinScaleDenominator>
    <se:MaxScaleDenominator>${SERVER_STYLE.smallPlotMarkerScale.max}</se:MaxScaleDenominator>
    <se:PointSymbolizer>
      <se:Graphic>
        <se:Mark>
          <se:WellKnownName>circle</se:WellKnownName>
          <se:Fill>
            ${svgParam('fill', color)}
            ${svgParam('fill-opacity', 0)}
          </se:Fill>
          <se:Stroke>
            ${svgParam('stroke', color)}
            ${svgParam('stroke-width', px(SERVER_STYLE.smallPlotMarkerStrokeWidth, dpi))}
          </se:Stroke>
        </se:Mark>
        <se:Size>${px(SERVER_STYLE.smallPlotMarkerSize, dpi)}</se:Size>
      </se:Graphic>
    </se:PointSymbolizer>
  </se:Rule>`;

const plotNumberLabel = (dpi: number) => `
  <se:Rule>
    <se:MinScaleDenominator>1</se:MinScaleDenominator>
    <se:MaxScaleDenominator>${SERVER_STYLE.labelMaxScaleDenominator}</se:MaxScaleDenominator>
    <se:TextSymbolizer>
      <se:Label><ogc:PropertyName>ploto_nr</ogc:PropertyName></se:Label>
      <se:Font>
        ${svgParam('font-family', SERVER_STYLE.labelFontFamily)}
        ${svgParam('font-size', (SERVER_STYLE.labelFontSizePt * dpi) / POINTS_PER_INCH)}
        ${svgParam('font-weight', LABEL_FONT_WEIGHT)}
      </se:Font>
      <se:LabelPlacement>
        <se:PointPlacement>
          <se:AnchorPoint>
            <se:AnchorPointX>${SERVER_STYLE.labelAnchor.x}</se:AnchorPointX>
            <se:AnchorPointY>${SERVER_STYLE.labelAnchor.y}</se:AnchorPointY>
          </se:AnchorPoint>
        </se:PointPlacement>
      </se:LabelPlacement>
      <se:Halo>
        <se:Radius>${px(LABEL_HALO_RADIUS_PX, dpi)}</se:Radius>
        <se:Fill>${svgParam('fill', LABEL_HALO_COLOR)}</se:Fill>
      </se:Halo>
      <se:Fill>${svgParam('fill', LABEL_COLOR)}</se:Fill>
      <se:VendorOption name="maxDisplacement">${SERVER_STYLE.labelMaxDisplacement}</se:VendorOption>
    </se:TextSymbolizer>
  </se:Rule>`;

const plotStyle = (color: string, dpi: number) => `
  <UserStyle>
    <se:FeatureTypeStyle>
      ${smallPlotMarker(color, dpi)}
      <se:Rule>
        <ogc:Filter>${statusFilter(PLOT_STATUS.APPROVED)}</ogc:Filter>
        ${outline(color, dpi)}
      </se:Rule>
      <se:Rule>
        <ogc:Filter>${statusFilter(PLOT_STATUS.DRAFT)}</ogc:Filter>
        ${outline(color, dpi, SERVER_STYLE.draftDashArray)}
        ${hatch(color, dpi, 'slash', SERVER_STYLE.draftHatchOutlineWidth)}
      </se:Rule>
      <se:Rule>
        <ogc:Filter>${statusFilter(PLOT_STATUS.EXPIRED)}</ogc:Filter>
        ${outline(color, dpi)}
        ${hatch(color, dpi, 'x', SERVER_STYLE.expiredHatchOutlineWidth)}
      </se:Rule>
      <se:Rule>
        <se:ElseFilter/>
        ${outline(color, dpi)}
      </se:Rule>
      ${plotNumberLabel(dpi)}
    </se:FeatureTypeStyle>
  </UserStyle>`;

// SLD vienos grupės plotų sluoksniams (patvirtinti / rengiami / negaliojantys):
// kiekvienam užklausos sluoksniui – NamedLayer su tuo pačiu stiliumi.
export function gamtotvarkaPlotsSldBody(color: string): WMSSldBodyFactory {
  return ({ layers, dpi }) => {
    const style = plotStyle(color, dpi);
    const namedLayers = layers
      .map((layer) => `<NamedLayer><se:Name>${escapeXml(layer)}</se:Name>${style}</NamedLayer>`)
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
      <StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:se="http://www.opengis.net/se" version="1.1.0">
        ${namedLayers}
      </StyledLayerDescriptor>`.replace(/>\s+</g, '><');
  };
}
