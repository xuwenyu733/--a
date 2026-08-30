<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useResumeStore } from '../stores/resumeStore'
import { uploadResumePhoto } from '../services/api'
import { getFileUrl } from '@/utils/fileUrl'
import {
  createEmptyEducation,
  createEmptyProject,
  createEmptyExperience,
} from '../utils/defaultBuilderForm'
import ResumeTemplatePicker from './ResumeTemplatePicker.vue'
import { RESUME_STYLE_OPTIONS } from '../constants/resumeStyles'

const store = useResumeStore()
const photoUploading = ref(false)
const photoInput = ref(null)
const fieldErrors = reactive({})

function clearFieldError(key) {
  delete fieldErrors[key]
}

function validateForm() {
  const errors = {}
  if (!store.builderForm.name?.trim()) {
    errors.name = '请填写姓名'
  }
  if (!store.builderForm.phone?.trim() && !store.builderForm.email?.trim()) {
    errors.phone = '请至少填写手机号或邮箱'
    errors.email = '请至少填写手机号或邮箱'
  }
  Object.assign(fieldErrors, errors)
  return Object.keys(errors).length === 0
}

async function onPhotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    ElMessage.error('证件照仅支持 JPG / PNG / WebP')
    return
  }
  photoUploading.value = true
  try {
    const res = await uploadResumePhoto(file)
    store.builderForm.photoUrl = res.path || res.url || ''
    ElMessage.success('证件照已上传')
  } catch (err) {
    ElMessage.error(err.message || '上传失败')
  } finally {
    photoUploading.value = false
    e.target.value = ''
  }
}

function addEducation() {
  store.builderForm.educations.push(createEmptyEducation())
}

function removeEducation(index) {
  if (store.builderForm.educations.length <= 1) return
  store.builderForm.educations.splice(index, 1)
}

function addProject() {
  store.builderForm.projects.push(createEmptyProject())
}

function removeProject(index) {
  if (store.builderForm.projects.length <= 1) return
  store.builderForm.projects.splice(index, 1)
}

function addExperience() {
  store.builderForm.experiences.push(createEmptyExperience())
}

function removeExperience(index) {
  store.builderForm.experiences.splice(index, 1)
}

async function handleGenerate() {
  if (!validateForm()) {
    const firstError = Object.values(fieldErrors)[0]
    ElMessage.warning(firstError)
    return
  }
  try {
    await store.generateFromBuilder()
    ElMessage.success('简历已生成')
  } catch {
    ElMessage.error(store.error || '生成失败')
  }
}
</script>

<template>
  <el-card class="builder-card" shadow="hover">
    <template #header>
      <span>填写信息 · 一键生成</span>
    </template>

    <div class="builder-scroll">
      <ResumeTemplatePicker v-model="store.builderForm.template" />

      <el-divider />

      <el-form label-position="top" size="default">
        <el-form-item label="二寸证件照（建议 413×626 像素）">
          <div class="photo-row">
            <div class="photo-box">
              <img
                v-if="store.builderForm.photoUrl"
                :src="getFileUrl(store.builderForm.photoUrl)"
                alt="证件照"
                class="photo-preview"
              />
              <span v-else class="photo-placeholder">暂无照片</span>
            </div>
            <div class="photo-actions">
              <input
                ref="photoInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                @change="onPhotoChange"
              />
              <el-button :loading="photoUploading" @click="photoInput?.click()">
                上传证件照
              </el-button>
              <el-button
                v-if="store.builderForm.photoUrl"
                link
                type="danger"
                @click="store.builderForm.photoUrl = ''"
              >
                移除
              </el-button>
            </div>
          </div>
        </el-form-item>

        <el-divider content-position="left">基本信息</el-divider>

        <el-form-item label="姓名" required :error="fieldErrors.name">
          <el-input
            v-model="store.builderForm.name"
            placeholder="张三"
            @input="clearFieldError('name')"
          />
        </el-form-item>

        <div class="grid-2">
          <el-form-item label="年龄">
            <el-input v-model="store.builderForm.age" placeholder="22" />
          </el-form-item>
          <el-form-item label="手机号" required :error="fieldErrors.phone">
            <el-input
              v-model="store.builderForm.phone"
              placeholder="13800000000"
              @input="clearFieldError('phone'); clearFieldError('email')"
            />
          </el-form-item>
        </div>

        <div class="grid-2">
          <el-form-item label="邮箱" required :error="fieldErrors.email">
            <el-input
              v-model="store.builderForm.email"
              placeholder="name@school.edu.cn"
              @input="clearFieldError('email'); clearFieldError('phone')"
            />
          </el-form-item>
          <el-form-item label="求职意向">
            <el-input v-model="store.builderForm.targetRole" placeholder="前端开发工程师" />
          </el-form-item>
        </div>

        <el-form-item label="所在城市（可选）">
          <el-input v-model="store.builderForm.city" placeholder="北京" />
        </el-form-item>

        <el-form-item label="个人简介 / 自我评价">
          <el-input
            v-model="store.builderForm.summary"
            type="textarea"
            :rows="3"
            placeholder="简要介绍你的优势、性格与职业目标..."
          />
        </el-form-item>

        <el-form-item label="技能栈（回车添加）">
          <el-select
            v-model="store.builderForm.skills"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="如 Vue、Node.js、MySQL"
            style="width: 100%"
          />
        </el-form-item>

        <el-divider content-position="left">教育经历</el-divider>

        <div v-for="(edu, i) in store.builderForm.educations" :key="'edu-' + i" class="block-item">
          <div class="block-item__head">
            <span>教育 {{ i + 1 }}</span>
            <el-button
              v-if="store.builderForm.educations.length > 1"
              link
              type="danger"
              :icon="Delete"
              @click="removeEducation(i)"
            />
          </div>
          <el-form-item label="学校">
            <el-input v-model="edu.school" placeholder="XX 大学" />
          </el-form-item>
          <div class="grid-2">
            <el-form-item label="专业">
              <el-input v-model="edu.major" placeholder="计算机科学与技术" />
            </el-form-item>
            <el-form-item label="学历">
              <el-input v-model="edu.degree" placeholder="本科" />
            </el-form-item>
          </div>
          <div class="grid-2">
            <el-form-item label="开始">
              <el-input v-model="edu.start" placeholder="2021-09" />
            </el-form-item>
            <el-form-item label="结束">
              <el-input v-model="edu.end" placeholder="2025-06" />
            </el-form-item>
          </div>
        </div>
        <el-button link type="primary" :icon="Plus" @click="addEducation">添加教育经历</el-button>

        <el-divider content-position="left">项目经历</el-divider>

        <div v-for="(proj, i) in store.builderForm.projects" :key="'proj-' + i" class="block-item">
          <div class="block-item__head">
            <span>项目 {{ i + 1 }}</span>
            <el-button
              v-if="store.builderForm.projects.length > 1"
              link
              type="danger"
              :icon="Delete"
              @click="removeProject(i)"
            />
          </div>
          <el-form-item label="项目名称">
            <el-input v-model="proj.name" placeholder="校园二手交易平台" />
          </el-form-item>
          <el-form-item label="项目角色 / 类型">
            <el-input
              v-model="proj.targetRole"
              placeholder="个人开发（前后端）"
            />
          </el-form-item>
          <el-form-item label="技术栈">
            <el-select
              v-model="proj.techStack"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="Vue3、Express、MongoDB"
              style="width: 100%"
            />
          </el-form-item>
          <div class="grid-2">
            <el-form-item label="开始">
              <el-input v-model="proj.start" placeholder="2024-03" />
            </el-form-item>
            <el-form-item label="结束">
              <el-input v-model="proj.end" placeholder="2024-06" />
            </el-form-item>
          </div>
          <el-form-item label="项目描述">
            <el-input
              v-model="proj.description"
              type="textarea"
              :rows="3"
              placeholder="负责什么、用了什么技术、取得了什么成果..."
            />
          </el-form-item>
        </div>
        <el-button link type="primary" :icon="Plus" @click="addProject">添加项目</el-button>

        <el-divider content-position="left">工作 / 实习（可选）</el-divider>

        <el-empty
          v-if="!store.builderForm.experiences.length"
          description="暂无工作经历，可点击下方添加"
          :image-size="48"
        />

        <div v-for="(exp, i) in store.builderForm.experiences" :key="'exp-' + i" class="block-item">
          <div class="block-item__head">
            <span>经历 {{ i + 1 }}</span>
            <el-button link type="danger" :icon="Delete" @click="removeExperience(i)" />
          </div>
          <div class="grid-2">
            <el-form-item label="公司">
              <el-input v-model="exp.company" placeholder="XX 科技" />
            </el-form-item>
            <el-form-item label="岗位">
              <el-input v-model="exp.role" placeholder="前端实习生" />
            </el-form-item>
          </div>
          <div class="grid-2">
            <el-form-item label="开始">
              <el-input v-model="exp.start" placeholder="2024-07" />
            </el-form-item>
            <el-form-item label="结束">
              <el-input v-model="exp.end" placeholder="2024-09" />
            </el-form-item>
          </div>
          <el-form-item label="工作内容">
            <el-input v-model="exp.description" type="textarea" :rows="2" placeholder="主要职责与成果..." />
          </el-form-item>
        </div>
        <el-button link type="primary" :icon="Plus" @click="addExperience">添加工作 / 实习</el-button>

        <el-divider content-position="left">荣誉与证书（可选）</el-divider>

        <el-form-item>
          <el-input
            v-model="store.builderForm.honors"
            type="textarea"
            :rows="2"
            placeholder="如：CCF-A类论文 ×2、ACM-ICPC 区域赛金牌、CET-6 600分、AWS Solutions Architect 认证..."
          />
        </el-form-item>

        <el-divider />

        <el-form-item label="目标岗位 JD（可选，用于针对性生成）">
          <el-input
            v-model="store.builderForm.jobDescription"
            type="textarea"
            :rows="3"
            placeholder="粘贴 JD，AI 将据此调整简历侧重点..."
          />
        </el-form-item>

        <el-form-item label="生成风格">
          <el-radio-group v-model="store.builderForm.style">
            <el-radio
              v-for="opt in RESUME_STYLE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.text }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>

    <el-alert
      v-if="store.generating"
      type="info"
      :closable="false"
      show-icon
      class="gen-hint"
      title="AI 正在生成并适配 A4 单页，通常需 30～90 秒，请勿关闭页面"
    />

    <div class="actions">
      <el-button
        type="primary"
        size="large"
        :loading="store.generating"
        :disabled="store.generating"
        @click="handleGenerate"
      >
        生成完整简历
      </el-button>
    </div>
  </el-card>
</template>

<style scoped>
.builder-card {
  border-radius: 12px;
}

.builder-scroll {
  max-height: calc(100vh - 280px);
  max-height: calc(100dvh - 280px);
  overflow-y: auto;
  padding-right: 4px;
}

.photo-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.photo-box {
  width: 90px;
  height: 126px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  flex-shrink: 0;
}

.photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  font-size: 12px;
  color: var(--app-muted, #909399);
  text-align: center;
  padding: 8px;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.block-item {
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.block-item__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
}

.gen-hint {
  margin-top: 12px;
}

.actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

@media (max-width: 960px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }

  .builder-scroll {
    max-height: none;
  }
}
</style>
