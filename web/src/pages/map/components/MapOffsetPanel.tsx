import {Col, Collapse, InputNumber, Row} from "antd";

interface MapOffsetPanelProps {
    offsetX: number;
    offsetY: number;
    onChangeX: (v: number) => void;
    onChangeY: (v: number) => void;
}

export const MapOffsetPanel = ({offsetX, offsetY, onChangeX, onChangeY}: MapOffsetPanelProps) => (
    <Collapse size="small" items={[{
        key: 'offsets',
        label: `Map Offset (X: ${offsetX}, Y: ${offsetY})`,
        children: (
            <Row gutter={16}>
                <Col span={12}>
                    <label>Offset X</label>
                    <InputNumber value={offsetX} onChange={(v) => onChangeX(v ?? 0)} min={-30} max={30} step={0.01} style={{width: '100%'}}/>
                </Col>
                <Col span={12}>
                    <label>Offset Y</label>
                    <InputNumber value={offsetY} onChange={(v) => onChangeY(v ?? 0)} min={-30} max={30} step={0.01} style={{width: '100%'}}/>
                </Col>
            </Row>
        ),
    }]}/>
);
