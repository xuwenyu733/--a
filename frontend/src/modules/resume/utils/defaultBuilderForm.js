import { DEFAULT_RESUME_STYLE } from '../constants/resumeStyles'

export function createEmptyEducation() {
  return { school: '', major: '', degree: '', start: '', end: '' }
}

export function createEmptyProject() {
  return { name: '', targetRole: '', description: '', techStack: [], start: '', end: '' }
}

export function createEmptyExperience() {
  return { company: '', role: '', description: '', start: '', end: '' }
}

export function createEmptyBuilderForm() {
  return {
    name: '',
    age: '',
    phone: '',
    email: '',
    city: '',
    targetRole: '',
    summary: '',
    photoUrl: '',
    skills: [],
    educations: [createEmptyEducation()],
    projects: [createEmptyProject()],
    experiences: [],
    honors: '',
    jobDescription: '',
    template: 'classic-green',
    style: DEFAULT_RESUME_STYLE,
  }
}
