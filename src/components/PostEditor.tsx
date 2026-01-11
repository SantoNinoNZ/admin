'use client'

import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Button,
  Select,
  Switch,
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
  CaretRightOutlined,
  ArrowLeftOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
  PictureOutlined,
} from '@ant-design/icons'
import type { PostFormData, Category, Tag as TagType } from '@/types'
import { supabaseAPI } from '@/lib/supabase-api'
import { notification } from 'antd'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TurndownService from 'turndown'
import { marked } from 'marked'

const { TextArea } = Input
const { Title } = Typography
const { CheckableTag } = Tag

// Initialize converters
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

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
  const isStaticPost = post.source === 'static'

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      setUploading(true)
      notification.info({
        title: 'Uploading...',
        description: `Uploading ${file.name}...`,
        duration: 2,
      })
      const imageUrl = await supabaseAPI.uploadImage(file, 'images')
      notification.success({
        title: 'Image Uploaded Successfully!',
        description: 'The image has been inserted into your content.',
        duration: 4,
      })
      return imageUrl
    } catch (err) {
      notification.error({
        title: 'Upload Failed',
        description: err instanceof Error ? err.message : 'Failed to upload image'
      })
      throw err
    } finally {
      setUploading(false)
    }
  }

  const handleFeaturedImageUpload = async (file: File) => {
    try {
      setUploading(true)
      notification.info({
        title: 'Uploading Featured Image...',
        description: `Uploading ${file.name}...`,
        duration: 2,
      })
      const imageUrl = await supabaseAPI.uploadImage(file, 'featured')
      form.setFieldsValue({ imageUrl })
      notification.success({
        title: 'Image Uploaded Successfully!',
        description: 'Featured image URL has been updated.',
        duration: 4,
      })
    } catch (err) {
      notification.error({
        title: 'Upload Failed',
        description: err instanceof Error ? err.message : 'Failed to upload image'
      })
    } finally {
      setUploading(false)
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your post content here... You can paste images directly!',
      }),
    ],
    content: post.content ? marked(post.content) as string : '',
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            event.preventDefault()
            const file = items[i].getAsFile()
            if (file) {
              handleImageUpload(file).then((url) => {
                editor?.chain().focus().setImage({ src: url }).run()
              })
            }
            return true
          }
        }
        return false
      },
      handleDrop: (view, event, slice, moved) => {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false

        for (let i = 0; i < files.length; i++) {
          if (files[i].type.indexOf('image') !== -1) {
            event.preventDefault()
            handleImageUpload(files[i]).then((url) => {
              const { schema } = view.state
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
              const node = schema.nodes.image.create({ src: url })
              const transaction = view.state.tr.insert(coordinates?.pos || 0, node)
              view.dispatch(transaction)
            })
            return true
          }
        }
        return false
      },
    },
  })

  useEffect(() => {
    form.setFieldsValue({
      ...post,
      tags: post.tagIds || [],
    })
    if (editor && post.content) {
      // Convert markdown to HTML for the editor
      const htmlContent = marked(post.content) as string
      if (htmlContent !== editor.getHTML()) {
        editor.commands.setContent(htmlContent)
      }
    }
    loadCategoriesAndTags()
  }, [post, form, editor])

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

    const htmlContent = editor?.getHTML() || ''
    if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<p></p>') {
      setError('Content is required')
      return
    }

    // Convert HTML to Markdown before saving
    const markdownContent = turndownService.turndown(htmlContent)

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
        content: markdownContent,
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

  const imageUrlValue = Form.useWatch('imageUrl', form)

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ ...post, tags: post.tagIds || [] }}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div className="post-editor-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={onCancel} />
            <div>
              <Title level={3} style={{ margin: 0, fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                {isNew ? 'Create New Post' : 'Edit Post'}
              </Title>
            </div>
          </div>
          <Space size="small" wrap style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="hide-on-small-mobile" style={{ fontSize: '14px', color: '#00000073' }}>Status</span>
              <Form.Item name="published" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch checkedChildren="Published" unCheckedChildren="Draft" />
              </Form.Item>
            </div>
            <Button onClick={onCancel} icon={<CloseCircleOutlined />} className="hide-text-on-mobile">
              <span className="button-text">Cancel</span>
            </Button>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} className="hide-text-on-mobile">
              <span className="button-text">Save</span>
            </Button>
          </Space>
        </div>

        {error && <Alert title={error} type="error" showIcon closable />}

        {isStaticPost && (
          <Alert
            title="Editing Static Post"
            description="This post is stored as a markdown file in GitHub. Changes will be committed directly to the repository. Categories, tags, and SEO fields are not available for static posts."
            type="info"
            showIcon
          />
        )}

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
                <Select placeholder="Select a category" allowClear disabled={isStaticPost}>
                  {categories.map(cat => <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
               <Form.Item label="Featured Image URL">
                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item name="imageUrl" noStyle>
                      <Input placeholder="https://example.com/image.png" />
                    </Form.Item>
                    <Button 
                      icon={<PictureOutlined />} 
                      loading={uploading}
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*'
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            await handleFeaturedImageUpload(file)
                          }
                        }
                        input.click()
                      }}
                    >
                      Upload
                    </Button>
                  </Space.Compact>
                </Form.Item>
                {imageUrlValue && (
                  <div style={{ marginTop: 8 }}>
                    <img 
                      src={imageUrlValue} 
                      alt="Featured" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '200px', 
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9'
                      }} 
                    />
                  </div>
                )}
            </Col>
            <Col span={24}>
              <Form.Item name="excerpt" label="Excerpt">
                <TextArea rows={2} placeholder="Brief description of the post" />
              </Form.Item>
            </Col>
             {!isStaticPost && (
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
             )}
          </Row>
        </Card>

        {!isStaticPost && (
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
        )}

        <Card title="Content">
          {editor && (
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '2px' }}>
              {/* Toolbar */}
              <div style={{
                borderBottom: '1px solid #d9d9d9',
                padding: '8px',
                background: '#fafafa',
                display: 'flex',
                gap: '4px',
                flexWrap: 'wrap'
              }}>
                <Button
                  size="small"
                  icon={<BoldOutlined />}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  type={editor.isActive('bold') ? 'primary' : 'default'}
                  title="Bold (Ctrl+B)"
                />
                <Button
                  size="small"
                  icon={<ItalicOutlined />}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  type={editor.isActive('italic') ? 'primary' : 'default'}
                  title="Italic (Ctrl+I)"
                />
                <div style={{ width: '1px', background: '#d9d9d9', margin: '0 4px' }} />
                <Button
                  size="small"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  type={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
                  title="Heading 1"
                >
                  H1
                </Button>
                <Button
                  size="small"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
                  title="Heading 2"
                >
                  H2
                </Button>
                <Button
                  size="small"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  type={editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'}
                  title="Heading 3"
                >
                  H3
                </Button>
                <div style={{ width: '1px', background: '#d9d9d9', margin: '0 4px' }} />
                <Button
                  size="small"
                  icon={<UnorderedListOutlined />}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  type={editor.isActive('bulletList') ? 'primary' : 'default'}
                  title="Bullet List"
                />
                <Button
                  size="small"
                  icon={<OrderedListOutlined />}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  type={editor.isActive('orderedList') ? 'primary' : 'default'}
                  title="Numbered List"
                />
                <div style={{ width: '1px', background: '#d9d9d9', margin: '0 4px' }} />
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => {
                    const url = window.prompt('Enter URL:')
                    if (url) {
                      editor.chain().focus().setLink({ href: url }).run()
                    }
                  }}
                  type={editor.isActive('link') ? 'primary' : 'default'}
                  title="Add Link"
                />
                <Button
                  size="small"
                  icon={<PictureOutlined />}
                  loading={uploading}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = async (e: any) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          const url = await handleImageUpload(file)
                          editor.chain().focus().setImage({ src: url }).run()
                        } catch (err) {
                          console.error('Image upload failed:', err)
                        }
                      }
                    }
                    input.click()
                  }}
                  title="Insert Image"
                />
              </div>

              {/* Editor */}
              <EditorContent editor={editor} />
            </div>
          )}
        </Card>

      </Space>

      <style jsx>{`
        @media (max-width: 576px) {
          :global(.hide-text-on-mobile .button-text) {
            display: none;
          }
          :global(.hide-on-small-mobile) {
            display: none !important;
          }
          :global(.ant-card) {
            border-radius: 4px;
          }
          :global(.ant-form-item) {
            margin-bottom: 16px;
          }
          :global(.tiptap) {
            min-height: 200px;
            font-size: 14px;
          }
        }
        @media (min-width: 577px) {
          :global(.hide-text-on-mobile .button-text) {
            display: inline;
          }
        }
      `}</style>
    </Form>
  )
}
