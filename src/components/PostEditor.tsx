'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Form,
  Input,
  Button,
  Select,
  Switch,
  Upload,
  Card,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Collapse,
  Alert,
} from 'antd'
import {
  SaveOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  CaretRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import type { PostFormData, Category, Tag as TagType } from '@/types'
import { supabaseAPI } from '@/lib/supabase-api'
import 'easymde/dist/easymde.min.css'

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false })
const { TextArea } = Input
const { Title } = Typography
const { CheckableTag } = Tag

interface PostEditorProps {
  post: PostFormData
  isNew: boolean
  onSave: (post: PostFormData) => Promise<void>
  onCancel: () => void
}

export function PostEditor({ post, isNew, onSave, onCancel }: PostEditorProps) {
  const [form] = Form.useForm()
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState(post.content || '')

  const simpleMdeOptions = useMemo(() => {
    return {
      spellChecker: false,
      placeholder: 'Write your post content in Markdown...',
      status: false,
      toolbar: [
        'bold', 'italic', 'heading', '|',
        'quote', 'unordered-list', 'ordered-list', '|',
        'link', 'image', '|',
        'preview', 'side-by-side', 'fullscreen', '|',
        'guide'
      ] as const,
    }
  }, [])

  useEffect(() => {
    form.setFieldsValue({
      ...post,
      tags: post.tagIds || [],
    })
    setContent(post.content || '')
    loadCategoriesAndTags()
  }, [post, form])

  const loadCategoriesAndTags = async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        supabaseAPI.getCategories(),
        supabaseAPI.getTags(),
      ])
      setCategories(categoriesData)
      setTags(tagsData)
    } catch (err) {
      console.error('Failed to load categories/tags:', err)
    }
  }

  const handleFinish = async (values: any) => {
    setError('')

    if (!content || content.trim() === '') {
      setError('Content is required')
      return
    }

    const isUnique = await supabaseAPI.isSlugUnique(values.slug, post.id)
    if (!isUnique) {
      setError('Slug must be unique. Please change it.')
      return
    }

    setSaving(true)
    try {
      const postData: PostFormData = {
        ...post,
        ...values,
        content,
        tagIds: values.tags,
      }
      await onSave(postData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post')
    } finally {
      setSaving(false)
    }
  }
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNew || !form.getFieldValue('slug')) {
      const newSlug = supabaseAPI.generateSlug(e.target.value)
      form.setFieldsValue({ slug: newSlug })
    }
  }

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e
    }
    return e && e.fileList
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ ...post, tags: post.tagIds || [] }}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={onCancel} size="large" />
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {isNew ? 'Create New Post' : 'Edit Post'}
              </Title>
            </div>
          </div>
          <Space size="middle">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '14px', color: '#00000073' }}>Status</span>
              <Form.Item name="published" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch checkedChildren="Published" unCheckedChildren="Draft" />
              </Form.Item>
            </div>
            <Button onClick={onCancel} icon={<CloseCircleOutlined />} size="large">
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large">
              Save
            </Button>
          </Space>
        </div>

        {error && <Alert message={error} type="error" showIcon closable />}

        <Card title="Post Details">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                <Input placeholder="Enter post title" onChange={handleTitleChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
                <Input placeholder="post-slug-will-be-here" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="categoryId" label="Category">
                <Select placeholder="Select a category" allowClear>
                  {categories.map(cat => <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
               <Form.Item name="imageUrl" label="Featured Image URL">
                  <Input placeholder="https://example.com/image.png" />
                </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="excerpt" label="Excerpt">
                <TextArea rows={2} placeholder="Brief description of the post" />
              </Form.Item>
            </Col>
             <Col span={24}>
                <Form.Item name="tags" label="Tags">
                    <Space size={[0, 8]} wrap>
                        {tags.map((tag) => (
                            <CheckableTag
                                key={tag.id}
                                checked={form.getFieldValue('tags')?.includes(tag.id)}
                                onChange={(checked) => {
                                    const currentTags = form.getFieldValue('tags') || [];
                                    const nextTags = checked
                                        ? [...currentTags, tag.id]
                                        : currentTags.filter((t: string) => t !== tag.id);
                                    form.setFieldsValue({ tags: nextTags });
                                }}
                            >
                                {tag.name}
                            </CheckableTag>
                        ))}
                    </Space>
                </Form.Item>
            </Col>
          </Row>
        </Card>

        <Collapse
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          items={[
            {
              key: '1',
              label: 'SEO Metadata',
              children: (
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item name="metaTitle" label="Meta Title">
                      <Input placeholder="Custom title for search engines" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="ogImage" label="OG Image URL">
                      <Input placeholder="Image for social media sharing" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="metaDescription" label="Meta Description">
                      <TextArea rows={3} placeholder="Custom description for search engines" />
                    </Form.Item>
                  </Col>
                </Row>
              ),
            },
          ]}
        />

        <Card title="Content">
          <SimpleMDE
            value={content}
            onChange={(value) => setContent(value)}
            options={simpleMdeOptions}
          />
        </Card>

      </Space>
    </Form>
  )
}
