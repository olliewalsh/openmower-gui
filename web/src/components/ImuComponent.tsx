import {Col, Row, Statistic} from "antd";
import {useImu} from "../hooks/useImu.ts";
import {statFormatter} from "./utils.tsx";

export function ImuComponent() {
    const imu = useImu();
    return <Row gutter={[16, 16]}>
        <Col lg={8} xs={24}><Statistic title="Angular Velocity X"
                                       value={statFormatter(imu.AngularVelocity?.X)}/></Col>
        <Col lg={8} xs={24}><Statistic title="Angular Velocity Y"
                                       value={statFormatter(imu.AngularVelocity?.Y)}/></Col>
        <Col lg={8} xs={24}><Statistic title="Angular Velocity Z"
                                       value={statFormatter(imu.AngularVelocity?.Z)}/></Col>
        <Col lg={8} xs={24}><Statistic title="Linear Acceleration X"
                                       value={statFormatter(imu.LinearAcceleration?.X)}/></Col>
        <Col lg={8} xs={24}><Statistic title="Linear Acceleration Y"
                                       value={statFormatter(imu.LinearAcceleration?.Y)}/></Col>
        <Col lg={8} xs={24}><Statistic title="Linear Acceleration Z"
                                       value={statFormatter(imu.LinearAcceleration?.Z)}/></Col>
        <Col lg={8} xs={24}><Statistic title="Orientation X" value={statFormatter(imu.Orientation?.X)}/></Col>
        <Col lg={8} xs={24}><Statistic title="Orientation Y" value={statFormatter(imu.Orientation?.Y)}/></Col>
        <Col lg={8} xs={24}><Statistic title="Orientation Z" value={statFormatter(imu.Orientation?.Z)}/></Col>
    </Row>;
}