import {Col, Row, Statistic} from "antd";
import {useGPS} from "../hooks/useGPS.ts";

export function GpsComponent() {
    const gps = useGPS();
    // Convert from +/- anti-clockwise radians from E to positive clockwise degrees from N
    const heading = gps.MotionHeading === undefined ? 0.0 : (450 -(gps.MotionHeading * 180.0/Math.PI)) % 360;
    return <Row gutter={[16, 16]}>
        <Col lg={8} xs={24}><Statistic precision={9} title="Position X"
                                       value={gps.Pose?.Pose?.Position?.X}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Position Y"
                                       value={gps.Pose?.Pose?.Position?.Y}/></Col>
        <Col lg={8} xs={24}><Statistic precision={2} title="Altitude" value={gps.Pose?.Pose?.Position?.Z}/></Col>
        <Col lg={8} xs={24}><Statistic precision={2} title="Heading" suffix={"°"}
                                       value={heading}/></Col>
        <Col lg={8} xs={24}><Statistic precision={3} title="Accuracy" value={gps.PositionAccuracy}/></Col>
    </Row>;
}