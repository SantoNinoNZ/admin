'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabaseAPI } from '@/lib/supabase-api'
import { Button, Typography, Space, Card, Tag, Tooltip, message } from 'antd'
import {
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons'

const { Text } = Typography

interface BuildStatus {
  current: {
    id: number
    status: 'queued' | 'in_progress' | 'completed'
    conclusion: 'success' | 'failure' | 'cancelled' | null
    created_at: string
    updated_at: string
    html_url: string
    event: string
  } | null
  lastSuccessful: {
    id: number
    completed_at: string
    html_url: string
  } | null
}

export function DeployStatusCard() {
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null)
  const [buildLoading, setBuildLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)

  const loadBuildStatus = useCallback(async () => {
    try {
      setBuildLoading(true)
      const status = await supabaseAPI.getBuildStatus()
      setBuildStatus(status)
    } catch (err) {
      console.error('Failed to load build status:', err)
    } finally {
      setBuildLoading(false)
    }
  }, [])

  const handleDeploy = async () => {
    try {
      setDeploying(true)
      await supabaseAPI.triggerRebuild()
      message.success('Deploy triggered! The site will be updated shortly.')
      setTimeout(() => {
        loadBuildStatus()
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger deploy'
      message.error(errorMessage)
    } finally {
      setDeploying(false)
    }
  }

  useEffect(() => {
    loadBuildStatus()
  }, [loadBuildStatus])

  useEffect(() => {
    if (buildStatus?.current?.status === 'in_progress' || buildStatus?.current?.status === 'queued') {
      const interval = setInterval(() => {
        loadBuildStatus()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [buildStatus?.current?.status, loadBuildStatus])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getBuildStatusTag = () => {
    if (!buildStatus?.current) return null

    const { status, conclusion } = buildStatus.current

    if (status === 'in_progress' || status === 'queued') {
      return (
        <Tag icon={<SyncOutlined spin />} color="processing">
          {status === 'queued' ? 'Queued' : 'Building...'}
        </Tag>
      )
    }

    if (status === 'completed') {
      if (conclusion === 'success') {
        return <Tag icon={<CheckCircleOutlined />} color="success">Deployed</Tag>
      }
      if (conclusion === 'failure') {
        return <Tag icon={<CloseCircleOutlined />} color="error">Failed</Tag>
      }
      if (conclusion === 'cancelled') {
        return <Tag icon={<CloseCircleOutlined />} color="warning">Cancelled</Tag>
      }
    }

    return null
  }

  const isBuilding = buildStatus?.current?.status === 'in_progress' || buildStatus?.current?.status === 'queued'

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space size="middle" wrap>
          <Space>
            <RocketOutlined style={{ fontSize: 18, color: '#1890ff' }} />
            <Text strong>Site Deployment</Text>
          </Space>
          {getBuildStatusTag()}
          {buildStatus?.lastSuccessful && (
            <Tooltip title="Last successful deployment">
              <Text type="secondary" style={{ fontSize: 13 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {formatDate(buildStatus.lastSuccessful.completed_at)}
              </Text>
            </Tooltip>
          )}
          {buildStatus?.current?.html_url && (
            <Tooltip title="View build on GitHub">
              <a href={buildStatus.current.html_url} target="_blank" rel="noopener noreferrer">
                <LinkOutlined />
              </a>
            </Tooltip>
          )}
        </Space>
        <Space>
          <Button
            size="small"
            icon={<SyncOutlined spin={buildLoading} />}
            onClick={loadBuildStatus}
            disabled={buildLoading}
          >
            Refresh
          </Button>
          <Tooltip title={isBuilding ? 'Build in progress' : 'Publish all changes to the live site'}>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              onClick={handleDeploy}
              loading={deploying}
              disabled={isBuilding}
            >
              Deploy Site
            </Button>
          </Tooltip>
        </Space>
      </div>
    </Card>
  )
}
