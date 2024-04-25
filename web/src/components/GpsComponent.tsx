import {Col, Row, Statistic} from "antd";
import {useGPS} from "../hooks/useGPS.ts";

export function GpsComponent() {
    const gps = useGPS();
    return <Row gutter={[16, 16]}>
        <Col lg={8} xs={24}><Statistic precision={9} title="Position X"
                                       value={gps.Pose?.Pose?.Position?.X}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Position Y"
                                       value={gps.Pose?.Pose?.Position?.Y}/></Col>
        <Col lg={8} xs={24}><Statistic precision={2} title="Altitude" value={gps.Pose?.Pose?.Position?.Z}/></Col>
        <Col lg={8} xs={24}><Statistic precision={2} title="Orientation"
                                       value={gps.MotionHeading}/></Col>
        <Col lg={8} xs={24}><Statistic precision={3} title="Accuracy" value={gps.PositionAccuracy}/></Col>
    </Row>;
}