import React, { lazy, Suspense, useMemo, useState } from "react";

import { useList, useNavigation } from "@refinedev/core";
import { GetFieldsFromList } from "@refinedev/nestjs-query";

import { DollarOutlined, RightCircleOutlined } from "@ant-design/icons";
import { AreaConfig } from "@ant-design/plots";
import { Button, Card, DatePicker } from "antd";
import dayjs from "dayjs";

import { Text } from "@/components";
import { DashboardDealsChartQuery } from "@/graphql/types";

import { DASHBOARD_DEALS_CHART_QUERY } from "./queries";

const Area = lazy(() => import("@ant-design/plots/es/components/area"));

export const DashboardDealsChart: React.FC = () => {
  const { list } = useNavigation();
  const { data, isError, error } = useList<
    GetFieldsFromList<DashboardDealsChartQuery>
  >({
    resource: "dealStages",
    filters: [{ field: "title", operator: "in", value: ["WON", "LOST"] }],
    meta: {
      gqlQuery: DASHBOARD_DEALS_CHART_QUERY,
    },
  });

  if (isError) {
    console.error("Error fetching deals chart data", error);
    return null;
  }
  const [selectedDateRange, setSelectedDateRange] = useState([]);
  const dealData = useMemo(() => {
    const won = data?.data
      .find((node) => node.title === "WON")
      ?.dealsAggregate.map((item) => {
        const { closeDateMonth, closeDateYear } = item.groupBy!;
        const date = dayjs(`${closeDateYear}-${closeDateMonth}-01`);
        return {
          timeUnix: date.unix(),
          timeText: date.format("MMM YYYY"),
          value: item.sum?.value,
          state: "Won",
        };
      });

    const lost = data?.data
      .find((node) => node.title === "LOST")
      ?.dealsAggregate.map((item) => {
        const { closeDateMonth, closeDateYear } = item.groupBy!;
        const date = dayjs(`${closeDateYear}-${closeDateMonth}-01`);
        return {
          timeUnix: date.unix(),
          timeText: date.format("MMM YYYY"),
          value: item.sum?.value,
          state: "Lost",
        };
      });

    let result = [...(won || []), ...(lost || [])].sort(
      (a, b) => a.timeUnix - b.timeUnix
    );

    // Apply date range filter if selectedDateRange is not empty
    if (selectedDateRange[0] && selectedDateRange[1]) {
      result = result.filter(
        (item) =>
          item.timeUnix >= selectedDateRange[0].unix() &&
          item.timeUnix <= selectedDateRange[1].unix()
      );
    }

    return result;
  }, [data, selectedDateRange]);

  const config: AreaConfig = {
    isStack: false,
    data: dealData,
    xField: "timeText",
    yField: "value",
    seriesField: "state",
    animation: true,
    startOnZero: false,
    smooth: true,
    legend: {
      offsetY: -6,
    },
    yAxis: {
      tickCount: 4,
      label: {
        formatter: (v) => {
          return `$${Number(v) / 1000}k`;
        },
      },
    },
    tooltip: {
      formatter: (data) => {
        return {
          name: data.state,
          value: `$${Number(data.value) / 1000}k`,
        };
      },
    },
    areaStyle: (datum) => {
      const won = "l(270) 0:#ffffff 0.5:#b7eb8f 1:#52c41a";
      const lost = "l(270) 0:#ffffff 0.5:#f3b7c2 1:#ff4d4f";
      return { fill: datum.state === "Won" ? won : lost };
    },
    color: (datum) => {
      return datum.state === "Won" ? "#52C41A" : "#F5222D";
    },
  };

  return (
    <Card
      style={{ height: "100%" }}
      headStyle={{ padding: "8px 16px" }}
      bodyStyle={{ padding: "10px" }}
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <DollarOutlined />
          <Text size="sm" style={{ marginLeft: ".5rem" }}>
            Deals
          </Text>
        
        </div>
      }
      extra={
        <Button onClick={() => list("deals")} icon={<RightCircleOutlined />}>
          See sales pipeline
        </Button>
      }
    >
      <Suspense>
        <Area {...config} height={325} />
      </Suspense>
      <div style={{
        display:"flex",
        justifyContent:"flex-end",
        marginTop:5

  
      }}>
      <DatePicker.RangePicker
            value={selectedDateRange}
            format={"DD/MM/YYYY"}
            onChange={(dates) => {
              // Convert moment objects to dayjs instances
              const dayjsDates = dates.map((date) => dayjs(date));
              setSelectedDateRange(dayjsDates);
            }}
          />
      </div>
    </Card>
  );
};
