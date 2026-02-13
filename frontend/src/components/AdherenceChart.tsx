import React from 'react'
import { Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

type Props = {
  taken: number
  missed: number
  upcoming?: number
  takenLeft?: number
  missedLeft?: number
  upcomingLeft?: number
}

export default function AdherenceChart({ taken, missed, upcoming = 0, takenLeft = 0, missedLeft = 0, upcomingLeft = 0 }: Props) {
  const data = {
    labels: ['Missed', 'Taken'],
    datasets: [
      {
        data: [missed, taken],
        backgroundColor: ['#ef4444', '#06b6d4'],
        hoverBackgroundColor: ['#ef4444', '#06b6d4'],
      },
    ],
  }

  const options = {
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="adherence-chart">
        <Pie data={data} options={options} />
      </div>
      <div className="flex items-center gap-6 justify-center">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 block rounded-sm bg-[#ef4444]"></span>
          <div className="text-sm">Missed</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 block rounded-sm bg-[#06b6d4]"></span>
          <div className="text-sm">Taken</div>
        </div>
      </div>
    </div>
  )
}
