export default async function globalTeardown() {
  // mongodb-memory-server 由各 suite afterAll 清理；此处预留 CI 全局收尾
}
