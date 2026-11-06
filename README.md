<img src="https://gw.alipayobjects.com/zos/antfincdn/R8sN%24GNdh6/language.svg" width="18"> [English](https://github.com/antvis/Sive/blob/main/README.en.md) | 中文

<p align="center">
  <a href="https://sive.antv.antgroup.com">
    <img width="128" src="./assets/sive.svg">
  </a>
</p>

<h1 align="center">🪼 Sive, See it Live, Share it Real.</h1>

蚂蚁集团 AntV 团队出品的 AI 驱动的数据可视化创作平台，用自然语言对话快速构建数据可视化图表、报告，以及数据分析，**让数据跃然眼前，让每一份洞察即刻可见、轻松分享**。

## 桌面端本地文件连接

CSV、JSON、XLSX 和 Parquet 文件通过原路径引用，不复制文件。连接支持修改显示名称和重新选择源文件；文件移动、改名或删除后，可重新选择文件恢复关联。

打开源数据预览、开始分析或刷新洞察 Snippet 时检查文件变化并更新表结构与画像，不在后台监听。刷新沿用原 SQL，失败保留上次成功结果，成功返回零行则显示空结果；原始分析记录保持不变。源文件更新后，请开始新的分析会话。

删除连接不会删除源文件或数据库，历史分析会话和洞察 Snippet 仍可查看和导出，但不能继续分析或刷新。
