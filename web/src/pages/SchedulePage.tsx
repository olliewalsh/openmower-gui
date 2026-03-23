import {App, Button, Card, Checkbox, Col, Row, Select, Switch, TimePicker, Table, Space, Popconfirm} from "antd";
import {ClockCircleOutlined, DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useCallback, useEffect, useRef, useState} from "react";
import {useApi} from "../hooks/useApi.ts";
import {useWS} from "../hooks/useWS.ts";
import {Map as MapType} from "../types/ros.ts";
import dayjs from "dayjs";

interface Schedule {
    id: string;
    area: number;
    time: string;
    daysOfWeek: number[];
    enabled: boolean;
    createdAt: string;
    lastRun?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function areaLabel(index: number, name: string | undefined): string {
    return name ? `${index + 1}. ${name}` : `Area ${index + 1}`;
}

export const SchedulePage = () => {
    const guiApi = useApi();
    const {notification} = App.useApp();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [workingAreas, setWorkingAreas] = useState<Array<string | undefined>>([]);
    const fetchedRef = useRef(false);

    const mapStream = useWS<string>(
        () => {
            console.log("SchedulePage: map stream closed");
        },
        () => {
            console.log("SchedulePage: map stream connected");
        },
        (data) => {
            const parsed = JSON.parse(data) as MapType;
            const names = (parsed.WorkingArea ?? []).map((a) => a.Name);
            setWorkingAreas(names);
        },
    );

    useEffect(() => {
        mapStream.start("/api/openmower/subscribe/map");
        return () => {
            mapStream.stop();
        };
        // mapStream functions are stable across renders — intentionally omitting from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const areaOptions = workingAreas.length > 0
        ? workingAreas.map((name, index) => ({
            label: areaLabel(index, name),
            value: index,
          }))
        : Array.from({length: Math.max(1, schedules.reduce((max, s) => Math.max(max, s.area + 1), 1))}, (_, i) => ({
            label: areaLabel(i, undefined),
            value: i,
          }));

    const fetchSchedules = useCallback(async () => {
        try {
            const response = await guiApi.request<{ schedules: Schedule[] }>({
                path: "/schedules",
                method: "GET",
                format: "json",
            });
            setSchedules(response.data.schedules ?? []);
        } catch {
            notification.error({message: "Failed to load schedules"});
        }
    }, [guiApi, notification]);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchSchedules();
    }, [fetchSchedules]);

    const handleCreate = async () => {
        setLoading(true);
        try {
            await guiApi.request({
                path: "/schedules",
                method: "POST",
                body: {
                    area: 0,
                    time: "09:00",
                    daysOfWeek: [1, 2, 3, 4, 5],
                    enabled: false,
                },
                format: "json",
            });
            await fetchSchedules();
        } catch {
            notification.error({message: "Failed to create schedule"});
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (sched: Schedule) => {
        try {
            await guiApi.request({
                path: `/schedules/${sched.id}`,
                method: "PUT",
                body: sched,
                format: "json",
            });
            await fetchSchedules();
        } catch {
            notification.error({message: "Failed to update schedule"});
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await guiApi.request({
                path: `/schedules/${id}`,
                method: "DELETE",
                format: "json",
            });
            await fetchSchedules();
        } catch {
            notification.error({message: "Failed to delete schedule"});
        }
    };

    const columns = [
        {
            title: "Enabled",
            dataIndex: "enabled",
            key: "enabled",
            width: 80,
            render: (enabled: boolean, record: Schedule) => (
                <Switch
                    checked={enabled}
                    onChange={(checked) => handleUpdate({...record, enabled: checked})}
                />
            ),
        },
        {
            title: "Time",
            dataIndex: "time",
            key: "time",
            width: 120,
            render: (time: string, record: Schedule) => (
                <TimePicker
                    value={dayjs(time, "HH:mm")}
                    format="HH:mm"
                    onChange={(val) => {
                        if (val) handleUpdate({...record, time: val.format("HH:mm")});
                    }}
                    size="small"
                />
            ),
        },
        {
            title: "Area",
            dataIndex: "area",
            key: "area",
            width: 200,
            render: (area: number, record: Schedule) => {
                const optionsWithCurrent = areaOptions.some((o) => o.value === area)
                    ? areaOptions
                    : [...areaOptions, {label: areaLabel(area, undefined), value: area}];
                return (
                    <Select
                        value={area}
                        size="small"
                        style={{width: "100%"}}
                        options={optionsWithCurrent}
                        onChange={(val) => handleUpdate({...record, area: val})}
                    />
                );
            },
        },
        {
            title: "Days",
            dataIndex: "daysOfWeek",
            key: "daysOfWeek",
            render: (days: number[], record: Schedule) => (
                <Checkbox.Group
                    value={days}
                    onChange={(checked) => handleUpdate({...record, daysOfWeek: checked as number[]})}
                    options={DAYS.map((label, i) => ({label, value: i}))}
                />
            ),
        },
        {
            title: "Last Run",
            dataIndex: "lastRun",
            key: "lastRun",
            width: 160,
            render: (lastRun: string | undefined) =>
                lastRun ? dayjs(lastRun).format("YYYY-MM-DD HH:mm") : "Never",
        },
        {
            title: "",
            key: "actions",
            width: 50,
            render: (_: unknown, record: Schedule) => (
                <Popconfirm title="Delete this schedule?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined/>} size="small"/>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Row gutter={[16, 16]}>
            <Col span={24}>
                <Card
                    title={<Space><ClockCircleOutlined/> Mowing Schedules</Space>}
                    size="small"
                    extra={
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={handleCreate}
                            loading={loading}
                            size="small"
                        >
                            Add
                        </Button>
                    }
                >
                    <Table
                        dataSource={schedules}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        scroll={{x: 600}}
                        locale={{emptyText: "No schedules configured. Click 'Add' to create one."}}
                    />
                </Card>
            </Col>
        </Row>
    );
};

export default SchedulePage;
