import {Card, Col, Row, Statistic, Tag, Space, Flex} from "antd";
import {
    ThunderboltOutlined,
    WarningOutlined,
    ApiOutlined,
    SoundOutlined,
    DashboardOutlined,
} from "@ant-design/icons";
import {useStatus} from "../hooks/useStatus.ts";
import {usePower} from "../hooks/usePower.ts";
import {useEmergency} from "../hooks/useEmergency.ts";
import {useDockingSensor} from "../hooks/useDockingSensor.ts";

const StatusTag = ({label, active, color}: { label: string; active: boolean; color?: string }) => (
    <Tag color={active ? (color ?? "green") : "default"}>{label}</Tag>
);

export function StatusComponent() {
    const status = useStatus();
    const power = usePower();
    const emergency = useEmergency();
    const dockingSensor = useDockingSensor();

    const mowerStatusLabel = status.MowerStatus === 255 ? "OK" : "Initializing";

    return <Row gutter={[16, 16]}>
        {/* System Status */}
        <Col lg={12} xs={24}>
            <Card title={<Space><ApiOutlined/> System Status</Space>} size="small">
                <Flex wrap gap="small" style={{marginBottom: 16}}>
                    <StatusTag label={`Mower: ${mowerStatusLabel}`} active={status.MowerStatus === 255}/>
                    <StatusTag label="RPi Power" active={!!status.RaspberryPiPower}/>
                    <StatusTag label="ESC Power" active={!!status.EscPower}/>
                    <StatusTag label="UI Board" active={!!status.UiBoardAvailable}/>
                    <StatusTag label="Mow Enabled" active={!!status.MowEnabled}/>
                </Flex>
                <Flex wrap gap="small">
                    <StatusTag label="Sound Module" active={!!status.SoundModuleAvailable}/>
                    <StatusTag label={status.SoundModuleBusy ? "Sound: Busy" : "Sound: Idle"}
                               active={!!status.SoundModuleBusy} color="orange"/>
                    <StatusTag label={status.RainDetected ? "Rain Detected" : "No Rain"}
                               active={!!status.RainDetected} color="blue"/>
                </Flex>
            </Card>
        </Col>

        {/* Power */}
        <Col lg={12} xs={24}>
            <Card title={<Space><ThunderboltOutlined/> Power</Space>} size="small">
                <Row gutter={[16, 16]}>
                    <Col span={8}>
                        <Statistic title="Battery" value={power.VBattery} precision={2} suffix="V"/>
                    </Col>
                    <Col span={8}>
                        <Statistic title="Charge" value={power.VCharge} precision={2} suffix="V"/>
                    </Col>
                    <Col span={8}>
                        <Statistic title="Current" value={power.ChargeCurrent} precision={2} suffix="A"/>
                    </Col>
                </Row>
                <Flex wrap gap="small" style={{marginTop: 12}}>
                    <StatusTag label={power.ChargerEnabled ? "Charger On" : "Charger Off"}
                               active={!!power.ChargerEnabled}/>
                    <StatusTag label={status.IsCharging ? "Charging" : "Not Charging"}
                               active={!!status.IsCharging} color="cyan"/>
                    {power.ChargerStatus ?
                        <Tag>{power.ChargerStatus}</Tag> : null}
                </Flex>
            </Card>
        </Col>

        {/* Emergency */}
        <Col lg={12} xs={24}>
            <Card title={<Space><WarningOutlined/> Emergency</Space>} size="small"
                  styles={{body: {paddingBottom: 12}}}>
                <Flex wrap gap="small" align="center">
                    <StatusTag label={emergency.ActiveEmergency ? "ACTIVE" : "Clear"}
                               active={!!emergency.ActiveEmergency} color="red"/>
                    <StatusTag label={emergency.LatchedEmergency ? "Latched" : "Not Latched"}
                               active={!!emergency.LatchedEmergency} color="orange"/>
                    {emergency.Reason ?
                        <Tag color="red">{emergency.Reason}</Tag> : null}
                </Flex>
            </Card>
        </Col>

        {/* Docking Sensor */}
        <Col lg={12} xs={24}>
            <Card title={<Space><DashboardOutlined/> Docking Sensor</Space>} size="small"
                  styles={{body: {paddingBottom: 12}}}>
                <Flex wrap gap="small">
                    <StatusTag label={`Left: ${dockingSensor.DetectedLeft ?? "-"}`}
                               active={(dockingSensor.DetectedLeft ?? 0) > 0} color="cyan"/>
                    <StatusTag label={`Right: ${dockingSensor.DetectedRight ?? "-"}`}
                               active={(dockingSensor.DetectedRight ?? 0) > 0} color="cyan"/>
                </Flex>
            </Card>
        </Col>

        {/* Mower Motor */}
        <Col span={24}>
            <Card title={<Space><SoundOutlined/> Mower Motor</Space>} size="small">
                <Row gutter={[16, 16]}>
                    <Col lg={4} xs={8}>
                        <Statistic title="ESC Status" value={status.MowerEscStatus}/>
                    </Col>
                    <Col lg={5} xs={12}>
                        <Statistic title="RPM" value={status.MowerMotorRpm} precision={0}/>
                    </Col>
                    <Col lg={5} xs={12}>
                        <Statistic title="Current" value={status.MowerEscCurrent} precision={2} suffix="A"/>
                    </Col>
                    <Col lg={5} xs={12}>
                        <Statistic title="ESC Temp" value={status.MowerEscTemperature} precision={1} suffix="°C"/>
                    </Col>
                    <Col lg={5} xs={12}>
                        <Statistic title="Motor Temp" value={status.MowerMotorTemperature} precision={1}
                                   suffix="°C"/>
                    </Col>
                </Row>
            </Card>
        </Col>
    </Row>;
}
