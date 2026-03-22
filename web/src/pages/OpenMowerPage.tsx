import {Card, Col, Collapse, Row, Typography} from "antd";
import {MowerActions} from "../components/MowerActions.tsx";
import {StatusComponent} from "../components/StatusComponent.tsx";
import {HighLevelStatusComponent} from "../components/HighLevelStatusComponent.tsx";
import {ImuComponent} from "../components/ImuComponent.tsx";
import {WheelTicksComponent} from "../components/WheelTicksComponent.tsx";
import {GpsComponent} from "../components/GpsComponent.tsx";

export const OpenMowerPage = () => {
    return <Row gutter={[16, 16]}>
        <Col span={24}>
            <Typography.Title level={2}>OpenMower</Typography.Title>
        </Col>
        <Col span={24}>
            <MowerActions/>
        </Col>
        <Col span={24}>
            <Card title="Overview" size="small">
                <HighLevelStatusComponent/>
            </Card>
        </Col>
        <Col span={24}>
            <StatusComponent/>
        </Col>
        <Col span={24}>
            <Collapse
                defaultActiveKey={[]}
                items={[
                    {
                        key: "sensors",
                        label: "Sensors & Diagnostics",
                        children: <Row gutter={[16, 16]}>
                            <Col span={24}>
                                <Card title="IMU" size="small">
                                    <ImuComponent/>
                                </Card>
                            </Col>
                            <Col lg={12} xs={24}>
                                <Card title="GPS" size="small">
                                    <GpsComponent/>
                                </Card>
                            </Col>
                            <Col lg={12} xs={24}>
                                <Card title="Wheel Ticks" size="small">
                                    <WheelTicksComponent/>
                                </Card>
                            </Col>
                        </Row>,
                    },
                ]}
            />
        </Col>
    </Row>
}

export default OpenMowerPage;
